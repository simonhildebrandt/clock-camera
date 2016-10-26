import React from 'react'
import Paper from 'material-ui/Paper'
import BackIcon from 'material-ui/svg-icons/navigation/arrow-back'
import IconButton from 'material-ui/IconButton'


class Clocks extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  render_clocks() {
    return Object.keys(this.props.clocks).map((key) => {
      let clock = this.props.clocks[key]
      return <Paper key={key} className="clock-small" zDepth={2} onTouchTap={ () => this.chooseClock(key) }>
        <div className="header bar">
          {clock.name || `clock ${key}`}
        </div>

        <div className="footer bar">
          <div className="rightly">[count] images</div>
          <div className={ 'type ' + (clock.variation || 'digital-twelve') }/>
        </div>
      </Paper>
    })
  }

  render_clock(key, selected=false) {
    let clock = this.props.clocks[key]
    return <Clock key={key} id={key} clock={clock} selected={selected} chooseClock={(key) => this.chooseClock(key)} />
  }

  render() {
    if (this.state.clock_id) {
      return this.render_clock(this.state.clock_id, true)
    } else {
      return <div>{ this.render_clocks() }</div>
    }
  }

  chooseClock(key) {
    this.setState({clock_id: key})
  }
}

class Clock extends React.Component {
  constructor(props) {
    super(props)

    this.state = {images: {}}
  }

  render() {
    return this.props.selected ? this.render_selected() : this.render_passive()
  }

  render_selected() {
    return <div>
     <div>
       <IconButton onTouchTap={ () => this.props.chooseClock(null) }><BackIcon/></IconButton>
       {this.props.clock.name || `clock ${this.props.id}`}
     </div>
   </div>
  }
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

export { Clock, Clocks, Display }
