import React from 'react'

class Clock extends React.Component {
  constructor(props) {
    super(props)

    this.state = {images: {}}
  }

  componentDidMount() {
    var imagesRef = this.props.firebase.database().ref(this.props.user_image_path)
    imagesRef.on('value', (snapshot) => {
      this.setState({images: snapshot.val() || {}})
    })

    this.setState({interval_id: setInterval(() => { this.update()}, 1000) })
  }

  componentWillUnmount() {
    clearInterval(this.state.interval_id)
  }

  update() {
    var date = new Date(), time = (date.getHours() * 60) + date.getMinutes()
    var image = Object.keys(this.state.images).map((key) => { return this.state.images[key] }).find((img) => {return img.time == time })
    this.setState({image: image})
  }

  render(){
    return <div className="clock">
      <img src={ this.state.image ? this.props.image_path(this.state.image) : ''} />
    </div>
  }
}

export default Clock
