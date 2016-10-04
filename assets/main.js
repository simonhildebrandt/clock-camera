import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'

window.$ = $

class Uploader {

  constructor() {
    $.get('/s3/config').done(data => {
      this.config = data
      $('body').on('change', 'input[type=file]', (event) => { this.uploader.addFiles(event.target.files) } )
      this.buildUploader()
      this.buildDropZone()
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
        'content-length-range': [0, 1000000]
        //'success-action-status': 201
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


new Uploader()
