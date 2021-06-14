import React, { useEffect, useState, useCallback } from 'react';

import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
function User({ userId }) {
  const [user, setUser] = useState({ name: '', email: '' });

  const fetchUser = useCallback(async () => {
    console.log('data')
    const res = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`
    );
    const newUser = await res.json();
    setUser(newUser);
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  return (
    <ListItem dense divider>
    <ListItemText primary={user.name} secondary={user.email} />
    </ListItem>
  );
}

export default User;