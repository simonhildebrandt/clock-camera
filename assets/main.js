import Navigo from 'navigo'
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
import Dialog from 'material-ui/Dialog'

import Image from './image'
import { Clocks } from './clocks'
import Navigation from './navigation'

import InjectTap from 'react-tap-event-plugin'
InjectTap()


class Chassis extends React.Component {
  constructor() {
    super()

    this.initialize()
    this.state = { loading_user: true, clock_id: null }
  }

  initialize() {
    this.router = new Navigo(null, true)

    // Logout
    // ((data) => {
    //   let { firebase, user } = data[0]
    //   firebase.auth().signOut()
    // })

    $.get('/app/config').done((data) => {
      this.setState({config: data}, () => {
        this.setState({firebase: this.buildFirebase()}, () => {
          this.state.firebase.auth().onAuthStateChanged(
            user => this.authStateChanged(user)
          )
        })
      })
    })
  }

  componentDidMount() {
    this.router.on({
      '/clocks/:id': (params) => { this.setState({clock_id: params.id}) },
      '/clocks/': (params) => { this.setState({clock_id: null}) },
      '/': (params) => { this.setState({clock_id: null}) }
    }).resolve()
  }

  authStateChanged(user) {
    console.log('authStateChanged')
    if (user) {
      if (!this.state.user_token) {
        this.state.firebase.auth().currentUser.getToken(false).then((idToken) => {
          this.setState({user_token: idToken, user: user})
        }
        // ).catch(function(error) {
        //     console.log(error)
        //     console.log("Error getting user token")
        //   }
        )
      }
    } else {
      this.setState({user: null, user_token: null})
      console.log('no user')
    }
    this.setState({loading_user: false})
  }

  signOut() {
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
    return firebase.initializeApp({
      apiKey: this.state.config.firebase.api_key,
      databaseURL: this.state.config.firebase.database_url,
      authDomain: this.state.config.firebase.auth_domain,
    })
  }

  getChildContext() {
    return {
      user: this.state.user,
      firebase: this.state.firebase
    }
  }

  muiTheme() {
    return getMuiTheme({
      palette: {
        primary1Color: blueGrey700
      }
    })
  }

  render() {
    if (this.state.loading_user) {
      return <div>Loading</div>
    } else if (this.state.user && this.state.firebase) {
      return <MuiThemeProvider muiTheme={this.muiTheme()}>
        <div className="page">
          <Navigation
            title={'ClockCamera'}
            user={this.state.user}
            handleLogout={ () => {this.signOut() }}
          />
          <div className="app-body">
            <Dialog open={false} />
            <Clocks chooseClock={ (key) => this.chooseClock(key) } clock_id={this.state.clock_id} />
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

  chooseClock(key) {
    this.router.navigate(key == null ? '/' : `/clocks/${key}`)
    this.setState({clock_id: key})
  }
}

Chassis.childContextTypes = {
  user: React.PropTypes.object,
  firebase: React.PropTypes.object,
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

  user_image_path(user) {
    return 'images/' + user.uid
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
          endpoint: '/app/s3/signature',
          customHeaders: () => { return this.getTokenHeaders() }
      },
      uploadSuccess: {
          endpoint: '/app/s3/success',
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
