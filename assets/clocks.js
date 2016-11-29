import React from 'react'

import Paper from 'material-ui/Paper'
import BackIcon from 'material-ui/svg-icons/navigation/arrow-back'
import IconButton from 'material-ui/IconButton'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'
import TextField from 'material-ui/TextField'



class Clocks extends React.Component {
  constructor(props, context) {
    super(props)

    this.user = context.user
    this.firebase = context.firebase

    this.state = {clocks: {}}
  }

  componentDidMount() {
    this.getClocks()
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
    />
  }

  render() {
    if (this.props.clock_id) {
      return this.render_clock(this.props.clock_id)
    } else {
      return <div className="clocks">
        { this.render_clocks() }
        { this.add_clock_button() }
      </div>
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

    return <FloatingActionButton onTouchTap={ () => { this.create$.next() } } style={style}>
      <ContentAdd />
    </FloatingActionButton>
  }

  user_clock_path() {
    return `clocks/${this.user.uid}`
  }

  createClock() {
    this.clocksRef.push({creator: this.user.uid, variation: 'digital-twelve'})
  }

  getClocks() {
    this.clocksRef = this.firebase.database().ref(this.user_clock_path(this.user))
    this.clocksRef.on('value', (snapshot) => {
      this.setState({clocks: snapshot.val() || {}})
    })
  }

  dropClocks() {
    this.clocksRef.off()
  }
}

class Clock extends React.Component {
  constructor(props, context) {
    super(props)

    this.state = {images: {}}
  }

  key() { return this.props.id }

  clock() { return this.props.clock }

  safe_name() { return this.clock().name || '[unnamed]' }

  render() {
    return this.props.selected ? this.render_large() : this.render_small()
  }

  render_small() {
    return <Paper
      key={this.key()}
      className="clock-small"
      zDepth={2}
      onTouchTap={ () => this.props.chooseClock(this.key()) }
    >
      <div>
        <div className="header bar">
          {this.safe_name()}
        </div>

        <div className="footer bar">
          <div className="rightly">[count] images</div>
          <div className={ 'type ' + (this.clock().variation || 'digital-twelve') }/>
        </div>
      </div>
    </Paper>
  }

  render_large() {
    return <div>
      <IconButton onTouchTap={ () => this.props.chooseClock(null) }><BackIcon/></IconButton>
      <TextField hintText="Clock name" value={this.clock().name} onChange={ (x) => { console.log(this.title$); this.title$.next(x) } } />
    </div>
  }
}


Clocks.contextTypes = {
  user: React.PropTypes.object,
  firebase: React.PropTypes.object
}

Clock.contextTypes = {
  user: React.PropTypes.object,
  firebase: React.PropTypes.object
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
