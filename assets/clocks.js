import React from 'react'

import Paper from 'material-ui/Paper'
import BackIcon from 'material-ui/svg-icons/navigation/arrow-back'
import IconButton from 'material-ui/IconButton'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'
import TextField from 'material-ui/TextField'


function pluralise(number, text) {
  return number + ' ' + (number == 1 ? text : text + 's')
}

class Clocks extends React.Component {
  constructor(props, context) {
    super(props)

    this.user = context.user
    this.firebase = context.firebase

    this.state = {clocks: null}
    this.clocksRef = this.firebase.database().ref(this.user_clock_path(this.user))
  }

  componentDidMount() {
    this.clocksRef.on('value', (snapshot) => {
      this.setState({clocks: snapshot.val() || {}})
    })
  }

  componentWillUnmount() {
    this.clocksRef.off()
  }

  render_clocks() {
    return Object.keys(this.state.clocks).map((key) => {
      return this.render_clock(key)
    })
  }

  render_clock(key) {
    let clock = this.state.clocks[key]
    return <Clock
      selected={key == this.props.clock_id}
      key={key} id={key} clock={clock}
      chooseClock={ (key) => { this.props.chooseClock(key) } }
      changeName={ (id, x) => this.changeName(id, x) }
    />
  }

  render() {
    if (this.state.clocks === null) {
      return <div>Loading clocks</div>
    } else {
      if (this.props.clock_id) {
        return this.render_clock(this.props.clock_id)
      } else {
        return <div className="clocks">
          { this.render_clocks() }
          { this.add_clock_button() }
        </div>
      }
    }
  }

  add_clock_button() {
    let style = {
      margin: 0,
      top: 'auto',
      right: 20,
      bottom: 20,
      left: 'auto',
      position: 'fixed',
    }

    return <FloatingActionButton onTouchTap={ () => { this.createClock() } } style={style}>
      <ContentAdd />
    </FloatingActionButton>
  }

  user_clock_path() {
    return `clocks/${this.user.uid}`
  }

  createClock() {
    this.clocksRef.push({creator: this.user.uid, variation: 'digital-twelve'})
  }

  changeName(id, name) {
    this.clocksRef.child(id).set({name: name})
  }
}

class Clock extends React.Component {
  constructor(props, context) {
    super(props)

    this.user = context.user
    this.firebase = context.firebase
    this.image_path = context.image_path
    this.state = {images: {}, name: this.clock().name}
  }

  componentDidMount() {
    this.imagesRef = this.firebase.database().ref(this.user_image_path())
    this.imagesRef.orderByChild('clock').equalTo(this.key()).on('value', (snapshot) => {
      this.setState({images: snapshot.val() || {}})
    })
  }

  componentWillUnmount() {
    this.imagesRef.off()
  }

  user_image_path() {
    return `images/${this.user.uid}`
  }

  key() { return this.props.id }

  clock() { return this.props.clock }

  safe_name() { return this.clock().name || '[unnamed]' }

  changeName(key, name) {
    this.setState({name: name})
    this.props.changeName(key, name)
  }

  render() {
    return this.props.selected ? this.render_large() : this.render_small()
  }

  first_image() {
    let first_key = Object.keys(this.state.images)[0]
    if (first_key) {
      return this.state.images[first_key]
    }
  }

  background() {
    if (this.first_image()) {
      return this.image_path(this.first_image(), 256)
    } else {
      return 'https://placeholdit.imgix.net/~text?txtsize=33&txt=256x256&w=256&h=256'
    }
  }

  render_small() {
    return <Paper
      key={this.key()}
      className="clock-small"
      zDepth={2}
      onTouchTap={ () => this.props.chooseClock(this.key()) }
    >
      <div style={ { backgroundImage: 'url(' + this.background() + ')' } } >
        <div className="header bar">
          {this.safe_name()}
        </div>

        <div className="footer bar">
          <div className="rightly">{ pluralise(Object.keys(this.state.images).length, 'image') }</div>
          <div className={ 'type ' + (this.clock().variation || 'digital-twelve') }/>
        </div>
      </div>
    </Paper>
  }

  render_large() {
    return <div>
      <IconButton onTouchTap={ () => this.props.chooseClock(null) }><BackIcon/></IconButton>
      <TextField hintText="Clock name" value={this.state.name} onChange={ (event) => { this.changeName(this.key(), event.target.value) } } />
      <div>
        { this.render_images() }
      </div>
    </div>
  }

  render_images() {
    console.log(this.state.images)
    return Object.keys(this.state.images).map((key) => {
      let img = this.state.images[key]
      return <img key={key} src={this.image_path(img, 256)} />
    })
  }
}


Clocks.contextTypes = {
  user: React.PropTypes.object.isRequired,
  firebase: React.PropTypes.object.isRequired
}

Clock.contextTypes = {
  user: React.PropTypes.object.isRequired,
  firebase: React.PropTypes.object.isRequired,
  image_path: React.PropTypes.func.isRequired
}



class Display extends React.Component {
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

export { Clocks, Clock }
