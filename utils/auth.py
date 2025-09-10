"""
Authentication utilities for the FES Calculator application.
Handles login, logout, and session management.
"""

import streamlit as st

# Demo accounts - temporary use only
DEMO_USERS = [
    {"username": "admin", "password": "admin123"},
    {"username": "user1", "password": "pass123"},
    {"username": "demo", "password": "demo123"},
    {"username": "guest", "password": "guest123"}
]

def check_login(username, password):
    """Check if the provided credentials match any demo account."""
    for user in DEMO_USERS:
        if user["username"] == username and user["password"] == password:
            return True
    return False

def login(username, password):
    """Log in the user by setting session state."""
    if check_login(username, password):
        st.session_state.logged_in = True
        st.session_state.username = username
        return True
    return False

def logout():
    """Log out the user by clearing session state."""
    st.session_state.logged_in = False
    st.session_state.username = None

def is_logged_in():
    """Check if a user is currently logged in."""
    return st.session_state.get("logged_in", False)

def get_current_user():
    """Get the username of the currently logged in user."""
    return st.session_state.get("username", None)

def get_demo_users():
    """Get the list of demo accounts for display."""
    return DEMO_USERS
