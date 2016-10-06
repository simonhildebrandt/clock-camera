import React from 'react'

class Image extends React.Component {
  constructor (props) {
    super(props)
    this.state = { time: this.time(), hours: this.hours(this.time()), minutes: this.minutes(this.time()) }
  }

  hours(time) {
    return Math.floor(time/60)
  }

  minutes(time) {
    return Math.floor(time % 60)
  }

  time() {
    return this.props.image.time || 615
  }

  currentTime(state) {
    let s = state || this.state
    return (60 * s.hours) + s.minutes
  }

  selectTime(mode, target) {
    let value = target.value
    target.setSelectionRange(0, value.length)
  }

  updateTime(mode, target) {
    let value = parseInt(target.value)
    if (isNaN(value)) value = ''
    this.setState({[mode]: value})

    if (!this.blank(this.state.hours) && !this.blank(this.state.minutes)) {
      this.setState((previousState, currentProps) => {
        return {time: this.currentTime(previousState)}
      }, () => {
        this.saveTime()
      })
    }
  }

  refreshTime(mode) {
    this.setState({[mode]: this[mode](this.currentTime())})
  }

  blank(value) {
    return (value === '' || value === undefined)
  }

  saveTime(){
    this.props.update(this.props.image_key, this.state.time)
  }

  render() {
    var image = this.props.image
    return <div className="image">
      <img src={this.props.path}/>
      <div className="times">
        {['hours', 'minutes'].map(mode => {
          return this.timeInput(mode)
        })}
      </div>
    </div>
  }

  timeInput(mode) {
    return <input type="text"
      key={mode}
      value={ this.state[mode] }
      onChange={ (event) => {this.updateTime(mode, event.target)} }
      onFocus={ (event) => {this.selectTime(mode, event.target)} }
      onBlur={ (event) => {this.refreshTime(mode)} }
    />
  }
}

export default Image
