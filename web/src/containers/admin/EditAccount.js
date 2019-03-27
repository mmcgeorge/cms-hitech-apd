import { FormLabel, Select, TextField } from '@cmsgov/design-system-core';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { STATES } from '../../util';

import AdminForm from './AdminForm';
import { editAccount as editAccountDispatch } from '../../actions/admin';
import { t } from '../../i18n';

class EditAccount extends Component {
  state = {
    error: false,
    success: false,
    userID: '',
    user: null,
    working: false
  };

  getForm = () => {
    const { currentUser, roles } = this.props;
    const { user } = this.state;

    if (user) {
      const { email, name, phone, position, state, role } = user;

      return (
        <Fragment>
          <hr />

          <TextField
            ariaLabel="please enter the user's full name"
            label="Name"
            name="name"
            value={name || ''}
            onChange={this.handleEditAccount}
          />

          <TextField
            label="Email"
            name="email"
            value={email}
            onChange={this.handleEditAccount}
          />

          <TextField
            label="Phone number"
            name="phone"
            size="medium"
            mask="phone"
            value={phone || ''}
            onChange={this.handleEditAccount}
          />

          <TextField
            label="Position"
            name="position"
            value={position || ''}
            onChange={this.handleEditAccount}
          />

          <FormLabel component="label" fieldId="modify_account_state">
            State
          </FormLabel>
          <Select
            id="modify_account_state"
            name="state"
            size="medium"
            value={state}
            onChange={this.handleEditAccount}
          >
            <option value="">None</option>
            {STATES.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <FormLabel component="label" fieldId="modify_account_role">
            Authorization role
          </FormLabel>
          <Select
            id="modify_account_role"
            name="role"
            size="medium"
            value={role || ''}
            onChange={this.handleEditAccount}
            disabled={currentUser.id === user.id}
          >
            <option value="">None</option>
            {roles.map(r => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
        </Fragment>
      );
    }
    return null;
  };

  handlePickAccount = e => {
    const { users } = this.props;
    const { value } = e.target;

    const user = users.filter(u => u.id === +value).reduce((_, u) => u, null);

    this.setState({ userID: +value, user });
  };

  handleEditAccount = e => {
    const { name, value } = e.target;
    this.setState(prev => ({ user: { ...prev.user, [name]: value } }));
  };

  editAccount = e => {
    e.preventDefault();
    const { editAccount } = this.props;
    const { user } = this.state;

    this.setState({ working: true });
    editAccount(user)
      .then(() => {
        this.setState({ error: false, success: true, working: false });
      })
      .catch(error => {
        this.setState({ error, success: false, working: false });
      });
  };

  render() {
    const { users } = this.props;
    const { error, success, userID, working } = this.state;

    const onSave = !!userID && this.editAccount;

    return (
      <Fragment>
        <header className="clearfix px2 py1 bg-white">
          <div className="left">
            <Link to="/" className="btn px0 bold caps">
              {t('titleBasic')}
            </Link>
          </div>
        </header>

        <AdminForm
          title="Manage accounts"
          error={error}
          success={success && 'Account saved'}
          working={working}
          onSave={onSave}
        >
          <FormLabel component="label" fieldId="modify_account_user">
            Account to edit
          </FormLabel>
          <Select
            id="modify_account_user"
            name="userID"
            value={`${userID}`}
            onChange={this.handlePickAccount}
          >
            <option value="">Select...</option>
            {users.map(u => (
              <option key={u.id} value={`${u.id}`}>
                {`${u.name ? `${u.name} - ` : ''}${u.email}`}
              </option>
            ))}
          </Select>

          {this.getForm()}
        </AdminForm>
      </Fragment>
    );
  }
}

EditAccount.propTypes = {
  currentUser: PropTypes.object.isRequired,
  editAccount: PropTypes.func.isRequired,
  roles: PropTypes.array.isRequired,
  users: PropTypes.array.isRequired
};

const mapStateToProps = ({
  admin: { roles, users },
  auth: { user: currentUser }
}) => ({
  currentUser,
  roles,
  users
});

const mapDispatchToProps = { editAccount: editAccountDispatch };

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditAccount);

export { EditAccount as plain, mapStateToProps, mapDispatchToProps };
