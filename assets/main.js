import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'

import firebase from "firebase/app"
import "firebase/database"
import "firebase/auth"

import React from 'react'
import ReactDOM from 'react-dom'

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import {blueGrey700} from 'material-ui/styles/colors'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'

import Image from './image'
import { Clocks, Clock } from './clock'
import Navigation from './navigation'

import InjectTap from 'react-tap-event-plugin'
InjectTap()


class Chassis extends React.Component {
  constructor() {
    super()

    this.state = { images: {}, clocks: {}, loading_user: true }
    $.get('/s3/config').done(data => {
      this.setState({config: data}, () => {
        this.setState({firebase: this.buildFirebase()}, () => {
          this.state.firebase.auth().onAuthStateChanged(user => this.authStateChanged(user))
        })
      })
    })
  }

  user_clock_path() {
    return `clocks/${this.state.user.uid}`
  }

  authed() {
    this.clocksRef = this.state.firebase.database().ref(this.user_clock_path())
    this.clocksRef.on('value', (snapshot) => {
      this.setState({clocks: snapshot.val() || {}})
    })
  }

  unauthed() {
    this.clocksRef.off()
  }

  authStateChanged(user) {
    console.log('authStateChanged')
    if (user) {
      if (!this.state.user_token) {
        this.state.firebase.auth().currentUser.getToken(false).then((idToken) => {
          this.setState({user_token: idToken, user: user}, () => {
            this.authed()
          })
        }).catch(function(error) {
          console.log(error)
          console.log("Error getting user token")
        })
      }
    } else {
      if (this.state.user) {
        this.unauthed()
      }
      this.setState({user: null, user_token: null})
      console.log('no user')
    }
    this.setState({loading_user: false})
  }

  signOut() {
    this.state.firebase.auth().signOut()
  }

  startLogin() {
    let provider = new firebase.auth.GoogleAuthProvider()
    this.state.firebase.auth().signInWithPopup(provider).catch((error) => {
      console.log('errors?')
      console.log(error)
      alert("Sorry, login didn't succeed.")
    })
  }

  buildFirebase() {
    let config = this.state.config.firebase

    return firebase.initializeApp({
      apiKey: config.api_key,
      databaseURL: config.database_url,
      authDomain: config.auth_domain,
    })
  }

  getChildContext() {
    return {
      config: this.state.config,
      firebase: this.state.firebase,
      user: this.state.user
    }
  }

  muiTheme() {
    return getMuiTheme({
      palette: {
        primary1Color: blueGrey700
      }
    })
  }

  createClock() {
    this.clocksRef.push({creator: this.state.user.uid, variation: 'digital-twelve'})
  }

  render() {
    if (this.state.loading_user) {
      return <div>Loading</div>
    } else if (this.state.user) {
      return <MuiThemeProvider muiTheme={this.muiTheme()}>
        <div className="page">
          <Navigation
            title={'ClockCamera'}
            user={this.state.user}
            handleLogout={ () => {this.signOut() }}
          />
          <div className="app-body">
            <Clocks clocks={this.state.clocks} />
            <FloatingActionButton
              onTouchTap={ () => { this.createClock() } }
              style={ {
                margin: 0,
                top: 'auto',
                right: 20,
                bottom: 20,
                left: 'auto',
                position: 'fixed',
              }
            }><ContentAdd />
            </FloatingActionButton>
          </div>
        </div>
      </MuiThemeProvider>
    } else {
      return <a href="#" onClick={(event) => this.startLogin() }>Google Login</a>
    }
  }

  image_path(image) {
    return `https://s3-${this.state.config.region}.amazonaws.com/${this.state.config.bucket_name}/${image.key}`
  }

  user_image_path() {
    return 'images/' + this.state.user.uid
  }
}

Chassis.childContextTypes = {
  user: React.PropTypes.object,
  config: React.PropTypes.object,
  firebase: React.PropTypes.object
}

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
      return <a href="#" onClick={() => { this.startLogin() }}>Login</a>
    } else {
      return <div>
        <a href="#" onClick={() => { this.signOut() }}>Sign Out</a>
        { this.addClock() }
        <input type="file" accept="image/*" />
        { this.images() }
      </div>
    }
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

//ReactDOM.render(<Uploader/>, $('#content').get(0))
ReactDOM.render(<Chassis/>, $('#content').get(0))
