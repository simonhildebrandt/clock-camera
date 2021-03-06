import React from 'react'
import AppBar from 'material-ui/AppBar'
import Popover from 'material-ui/Popover'
import IconButton from 'material-ui/IconButton'
import MenuIcon from 'material-ui/svg-icons/navigation/menu'
import FlatButton from 'material-ui/FlatButton'
import ExpandIcon from 'material-ui/svg-icons/navigation/expand-more'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'
import Drawer from 'material-ui/Drawer'
import Divider from 'material-ui/Divider'
import Subheader from 'material-ui/Subheader'
import {List, ListItem} from 'material-ui/List'


class Navigation extends React.Component {

  constructor(props) {
    super(props)

    this.state = {}
  }

  username() {
    return this.props.user.displayName
  }

  userMenu () {
    return <FlatButton
      onTouchTap={(event) => this.openUserMenu(event)}
      label={this.username()}
      labelPosition="before"
      primary={true}
      icon={<ExpandIcon />}
    />
  }

  sideDrawer () {
    return <IconButton onTouchTap={(event) => this.openSideDrawer(event)}><MenuIcon /></IconButton>
  }

  openUserMenu(event) {
    // This prevents ghost click.
    event.preventDefault()

    this.setState({
      userMenuOpen: true,
      anchorEl: event.currentTarget,
    })
  }

  openSideDrawer(event) {
    // This prevents ghost click.
    event.preventDefault()

    this.setState({
      drawerOpen: true
    })
  }

  handleLogout() {
    event.preventDefault()
    console.log('logging out')
    this.props.handleLogout()
  }

  closeUserMenu(){
    this.setState({
      userMenuOpen: false
    })
  }

  render() {
    return <div>
      <AppBar
        title={this.props.title}
        titleStyle={ {fontFamily: "Neuton", fontSize: 36} }
        iconElementLeft={this.sideDrawer()}
        iconElementRight={this.userMenu()} />
      <Popover
        open={this.state.userMenuOpen}
        anchorEl={this.state.anchorEl}
        anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
        targetOrigin={{horizontal: 'left', vertical: 'top'}}
        onRequestClose={() => this.closeUserMenu()}
      >
        <Menu>
          <MenuItem
            primaryText="Sign out"
            onTouchTap={() => this.handleLogout()}
          />
        </Menu>
      </Popover>
      <Drawer
        docked={false}
        width={200}
        open={this.state.drawerOpen}
        onRequestChange={(open) => this.setState({drawerOpen: open})}
      >
        <Subheader>ClockCamera</Subheader>
        <List>
          <Subheader>Models</Subheader>
        </List>
        <Divider />
      </Drawer>
    </div>
  }
}

Navigation.contextTypes = {
  user$: React.PropTypes.object
}

export default Navigation
