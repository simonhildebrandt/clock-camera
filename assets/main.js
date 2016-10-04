import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'

import firebase from "firebase/app"
import "firebase/database"

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
      return <Clock firebase={this.firebase} image_path={(image) => { return this.image_path(image)} } />
    }
  }

  render() {
    return <div>
      { this.addClock() }
      <input type="file" id="input"/>
      { this.images() }
    </div>
  }

  updateImage(key, attrs) {
    var imageRef = this.firebase.database().ref(`images/${key}`)
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

  initFirebase() {
    this.firebase = firebase.initializeApp({
      apiKey: this.config.firebase.api_key,
      databaseURL: this.config.firebase.database_url
    })

    var imagesRef = this.firebase.database().ref('images')
    imagesRef.on('value', (snapshot) => {
      this.setState({images: snapshot.val() || {}})
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
          endpoint: '/s3/signature'
      },
      uploadSuccess: {
          endpoint: '/s3/success'
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
