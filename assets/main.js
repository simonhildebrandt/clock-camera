import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'

import firebase from "firebase/app"
import "firebase/database"
import "firebase/auth"

import React from 'react'
import ReactDOM from 'react-dom'

import Image from './image'
import Clock from './clock'


class Uploader extends React.Component {

  constructor() {
    super()

    this.state = {images: {}}

    $.get('/s3/config').done(data => {
      this.config = data
      $('body').on('change', 'input[type=file]', (event) => { this.uploader.addFiles(event.target.files) } )
      this.buildUploader()
      this.buildDropZone()
      this.initFirebase()
    })
  }

  addClock() {
    if (this.firebase) {
      return <Clock
        firebase={this.firebase}
        user_image_path={this.user_image_path()}
        image_path={(image) => { return this.image_path(image)} }
      />
    }
  }

  render() {
    if(!this.state.user) {
      return null
    }
    return <div>
      <a href="#" onClick={(event) => { this.signOut() }}>Sign Out</a>
      { this.addClock() }
      <input type="file" accept="image/*" />
      { this.images() }
    </div>
  }

  signOut() {
    this.setState({user: null})
    this.firebase.auth().signOut()
  }

  updateImage(key, attrs) {
    var imageRef = this.firebase.database().ref(`${this.user_image_path()}/${key}`)
    imageRef.update(attrs)
  }

  images() {
    return Object.keys(this.state.images).map(key => {
      let image = this.state.images[key]
      return <Image
        key={key}
        image_key={key}
        image={image}
        path={this.image_path(image)}
        update={(key, time) => {this.updateImage(key, {time: time})}}
      />
    })
  }

  image_path(image) {
    return `https://s3-${this.config.region}.amazonaws.com/${this.config.bucket_name}/${image.key}`
  }

  user_image_path() {
    return 'images/' + this.state.user.uid
  }

  initFirebase() {
    this.firebase = firebase.initializeApp({
      apiKey: this.config.firebase.api_key,
      databaseURL: this.config.firebase.database_url,
      authDomain: this.config.firebase.auth_domain,
    })


    this.firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('got user')
        console.log(user)
        this.setState({user: user})
        this.firebase.auth().currentUser.getToken(/* forceRefresh */ true).then((idToken) => {
          this.setState({user_token: idToken})
        }).catch(function(error) {
          console.log("Error getting user token")
        });

        console.log(this.user_image_path())
        var imagesRef = this.firebase.database().ref(this.user_image_path())
        imagesRef.on('value', (snapshot) => {
          console.log(snapshot)
          this.setState({images: snapshot.val() || {}})
        })

      } else {
        console.log('no user')
        var provider = new firebase.auth.GoogleAuthProvider()
        this.firebase.auth().signInWithPopup(provider).then(function(result) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
          // ...
        }).catch(function(error) {
          console.log('errors?')
          console.log(error)
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // The email of the user's account used.
          var email = error.email;
          // The firebase.auth.AuthCredential type that was used.
          var credential = error.credential;
          // ...
        })
      }
    })

  }

  buildDropZone() {
    this.dragAndDropModule = new qq.DragAndDrop({
      dropZoneElements: [$('body').get(0)],
      classes: {
        dropActive: "cssClassToAddToDropZoneOnEnter"
      },
      callbacks: {
        processingDroppedFiles: () => {
          console.log('processingDroppedFiles')
          //TODO: display some sort of a "processing" or spinner graphic
        },
        processingDroppedFilesComplete: (files, dropTarget) => {
          console.log('processingDroppedFilesComplete')
          //TODO: hide spinner/processing graphic

          this.uploader.addFiles(files); //this submits the dropped files to Fine Uploader
        }
      }
    })
  }

  getTokenHeaders() {
    return { 'User-Token': this.state.user_token }
  }

  buildUploader() {
    this.uploader = new qq.s3.FineUploaderBasic({
      debug: this.config.debug,
      objectProperties: {
        bucket: this.config.bucket_name,
        acl: 'public-read',
        region: this.config.region,
        key: function(id) {
          var name = this.getName(id), extension = qq.getExtension(name)
          return `images/${this.getUuid(id)}.${extension}`
        }
      },
      request: {
          endpoint: this.config.endpoint,
          accessKey: this.config.access_key
      },
      signature: {
          endpoint: '/s3/signature',
          customHeaders: () => { return this.getTokenHeaders() }
      },
      uploadSuccess: {
          endpoint: '/s3/success',
          customHeaders: () => { return this.getTokenHeaders() }
      },
      validation: {
        sizeLimit: this.config.max_file_size,
      },
      callbacks: {
        onProgress: (id, name, uploadedBytes, totalBytes) => {
          console.log(id, name, uploadedBytes, totalBytes)
        }
      }
    })
  }
}

ReactDOM.render(<Uploader/>, $('#content').get(0))
