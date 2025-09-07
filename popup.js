// Global references for all HTML elements
let mainForm;
let loginForm;
let signupForm;
let taskManager;
let loginBtn;
let signupBtn;
let submitLoginBtn;
let submitSignupBtn;
let backToMainBtn;
let backToMain2Btn;
let loginUsernameInput;
let loginPasswordInput;
let signupUsernameInput;
let signupPasswordInput;

let addTaskBtn;
let taskInput;
let taskList;
let groupDropdown;
let addGroupBtn;
let deleteGroupBtn;
let logoutBtn;
let splashVideo; // Added reference for the video element

const API_URL = 'http://127.0.0.1:8000/api/';

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['authToken'], (result) => {
      resolve(result.authToken);
    });
  });
}

function createTaskElement(task) {
  const newTask = document.createElement('li');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.classList.add('task-checkbox');
  checkbox.addEventListener('change', () => handleCompleteTask(task, checkbox));
  newTask.appendChild(checkbox);

  const taskSpan = document.createElement('span');
  taskSpan.textContent = task.text;
  taskSpan.classList.add('task-text');
  if (task.completed) {
      taskSpan.classList.add('completed');
  }
  taskSpan.addEventListener('click', () => activateTaskEdit(task, taskSpan));
  newTask.appendChild(taskSpan);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'x';
  removeBtn.classList.add('remove-btn');
  newTask.appendChild(removeBtn);

  removeBtn.addEventListener('click', () => {
    if (!task.id) {
      console.error("Task ID not found for deletion. Task might not have been properly created.");
      alert("Failed to delete task. It might not have been created on the server.");
      return;
    }
    getToken().then(token => {
      fetch(`${API_URL}tasks/${task.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`
        },
      }).then(response => {
        if (response.ok) {
          newTask.remove();
        } else {
          console.error('Failed to delete task with ID:', task.id, 'Response:', response);
          alert('Failed to delete task. You might not have permission or it no longer exists.');
        }
      }).catch(error => {
        console.error('Network error on delete:', error);
        alert('Network error on delete.');
      });
    });
  });
  return newTask;
}

function handleCompleteTask(task, checkboxElement) {
    const isCompleted = checkboxElement.checked;
    const taskSpanElement = checkboxElement.nextElementSibling;
    getToken().then(token => {
        const dataToUpdate = { 
            text: task.text,
            completed: isCompleted,
        };
        if (task.group) {
            dataToUpdate.group = task.group;
        }
        fetch(`${API_URL}tasks/${task.id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify(dataToUpdate),
        }).then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(JSON.stringify(err)); });
            }
            return response.json();
        }).then(updatedTask => {
            task.completed = updatedTask.completed;
            if (task.completed) {
                taskSpanElement.classList.add('completed');
            } else {
                taskSpanElement.classList.remove('completed');
            }
        }).catch(error => {
            console.error('Error completing task:', error);
            alert('Failed to update task completion status. Error: ' + error.message);
            checkboxElement.checked = !isCompleted; 
        });
    });
}

function activateTaskEdit(task, taskSpanElement) {
    if (taskSpanElement.querySelector('input')) {
        return; 
    }
    const originalText = task.text;
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = originalText;
    inputField.classList.add('edit-task-input'); 
    taskSpanElement.replaceChildren(inputField);
    inputField.focus(); 
    inputField.select(); 
    const saveEdit = () => {
        const newText = inputField.value.trim();
        if (newText === '') {
            alert("Task text cannot be empty.");
            taskSpanElement.textContent = originalText; 
            task.text = originalText; 
            return;
        }
        if (newText === originalText) {
            taskSpanElement.textContent = originalText;
            return;
        }
        getToken().then(token => {
            const dataToUpdate = { 
                text: newText,
                completed: task.completed,
            };
            if (task.group) {
                dataToUpdate.group = task.group;
            }
            fetch(`${API_URL}tasks/${task.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify(dataToUpdate),
            }).then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(JSON.stringify(err)); });
                }
                return response.json();
            }).then(updatedTask => {
                taskSpanElement.textContent = updatedTask.text;
                task.text = updatedTask.text;
            }).catch(error => {
                console.error('Error editing task:', error);
                alert('Failed to edit task. Error: ' + error.message);
                taskSpanElement.textContent = originalText;
                task.text = originalText;
            });
        });
    };
    inputField.addEventListener('blur', saveEdit);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            inputField.blur();
        }
    });
}

function loadTasks() {
  getToken().then(token => {
    if (!token) {
      showMainScreen(); // Show main screen if token is somehow lost
      return;
    }
    
    const selectedGroupId = groupDropdown.value;
    let url = `${API_URL}tasks/`;
    if (selectedGroupId) {
      url += `?group=${selectedGroupId}`;
    } else {
      url += `?group__isnull=True`;
    }
    fetch(url, {
      headers: {
        'Authorization': `Token ${token}`
      },
    })
    .then(response => {
      if (response.status === 401) {
        chrome.storage.sync.set({ 'authToken': null }, () => {
          showMainScreen();
          alert("Your session has expired. Please log in again.");
        });
        return Promise.reject('Unauthorized');
      }
      return response.json();
    })
    .then(tasks => {
      if (taskList) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
          const taskElement = createTaskElement(task);
          taskList.appendChild(taskElement);
        });
      }
    })
    .catch(error => {
      console.error('Error loading tasks:', error);
      if (error !== 'Unauthorized') {
        alert('Error loading tasks. Please try logging in again.');
        showMainScreen();
      }
    });
  });
}

function loadGroups() {
  getToken().then(token => {
    if (!token) return;
    fetch(`${API_URL}groups/`, {
      headers: {
        'Authorization': `Token ${token}`
      },
    })
    .then(response => response.json())
    .then(groups => {
      if (groupDropdown) {
        groupDropdown.innerHTML = '';
        const personalOption = document.createElement('option');
        personalOption.value = '';
        personalOption.textContent = 'Personal';
        groupDropdown.appendChild(personalOption);
        groups.forEach(group => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = group.name;
          groupDropdown.appendChild(option);
        });
        chrome.storage.sync.set({'groups': groups});
      }
    })
    .catch(error => console.error('Error loading groups:', error));
  });
}

function handleLogin(event) {
  event.preventDefault();
  const username = loginUsernameInput.value;
  const password = loginPasswordInput.value;
  fetch(`http://127.0.0.1:8000/api/api-token-auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  }).then(response => {
    if (response.status === 400) {
      alert('Login failed. Please check your username and password.');
      return Promise.reject('Invalid credentials');
    }
    return response.json();
  })
  .then(data => {
    if (data.token) {
      chrome.storage.sync.set({ 'authToken': data.token }, () => {
        // Clear inputs after successful login
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        
        // Correctly show task manager and hide others
        mainForm.classList.add('hidden-element');
        loginForm.classList.add('hidden-element');
        signupForm.classList.add('hidden-element');
        taskManager.classList.remove('hidden-element');

        loadGroups();
        loadTasks();
      });
    }
  })
  .catch(error => {
    console.error('Error during login:', error);
    alert('Network error during login. Is the server running?');
  });
}

function handleRegister(event) {
  event.preventDefault();
  const username = signupUsernameInput.value;
  const password = signupPasswordInput.value;

  if (!username || !password) {
      alert("Username and password cannot be empty.");
      return;
  }

  fetch(`${API_URL}register/`, { // Assuming you create a /api/register/ endpoint
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  }).then(response => {
      if (response.status === 400) {
          return response.json().then(err => {
              let errorMsg = "Registration failed.";
              if (err.username) errorMsg += ` Username: ${err.username.join(', ')}`;
              if (err.password) errorMsg += ` Password: ${err.password.join(', ')}`;
              alert(errorMsg);
              return Promise.reject('Registration validation failed');
          });
      }
      if (!response.ok) {
          alert('Registration failed. Please try again.');
          return Promise.reject('Registration failed with status: ' + response.status);
      }
      return response.json();
  })
  .then(data => {
      alert(`User "${username}" registered successfully! Please log in.`);
      // After successful registration, direct them to the login form
      signupUsernameInput.value = '';
      signupPasswordInput.value = '';
      showLoginForm(); 
  })
  .catch(error => {
      console.error('Error during registration:', error);
      if (error.message && error.message.includes('Failed to fetch')) {
        alert('Network error during registration. Is the Django server running and has a /api/register/ endpoint?');
      }
  });
}

function handleDeleteGroup() {
    const selectedGroupId = groupDropdown.value;
    const selectedGroupName = groupDropdown.options[groupDropdown.selectedIndex].text;
    if (!selectedGroupId) {
        alert('Cannot delete the "Personal" group.');
        return;
    }
    if (!confirm(`Are you sure you want to delete the group "${selectedGroupName}"? This will delete all tasks within it.`)) {
        return;
    }
    getToken().then(token => {
        fetch(`${API_URL}groups/${selectedGroupId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Token ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                alert(`Group "${selectedGroupName}" has been deleted.`);
                loadGroups();
                loadTasks();
            } else {
                return response.json().then(err => { throw new Error(JSON.stringify(err)); });
            }
        })
        .catch(error => {
            console.error('Error deleting group:', error);
            alert(`Failed to delete group. Error: ${error.message}`);
        });
    });
}

function handleLogout() {
    chrome.storage.sync.set({ 'authToken': null }, () => {
        if (taskList) {
            taskList.innerHTML = '';
        }
        showMainScreen();
        alert("You have been logged out.");
    });
}

function handleAddTask() {
  if (!taskInput || !groupDropdown) {
      console.error("Task input or group dropdown not available.");
      return;
  }
  const taskText = taskInput.value.trim();
  if (taskText === '') {
      alert("Task cannot be blank!");
      taskInput.value = '';
      return;
  }
  const selectedGroupId = groupDropdown.value;
  const data = {
    text: taskText,
  };
  if (selectedGroupId !== '') {
      data.group = selectedGroupId;
  }
  getToken().then(token => {
    fetch(`${API_URL}tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(data),
    }).then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(JSON.stringify(err)); });
        }
        return response.json();
    })
      .then(task => {
        if (!selectedGroupId || (task.group && task.group == selectedGroupId) || (!task.group && !selectedGroupId)) {
          if (taskList) {
            const taskElement = createTaskElement(task);
            taskList.appendChild(taskElement);
          }
        }
        taskInput.value = '';
      })
      .catch(error => {
        console.error('Error adding task:', error);
        alert('Failed to add task. Make sure you are logged in and the task is not blank. Error: ' + error.message);
      });
  });
}

function handleAddGroup() {
  const groupName = prompt('Enter a name for the new group:');
  if (groupName && groupName.trim() !== '') {
    getToken().then(token => {
      fetch(`${API_URL}groups/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ name: groupName }),
      }).then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(JSON.stringify(err)); });
        }
        return response.json();
      }).then(group => {
        alert(`Group "${group.name}" created successfully!`);
        loadGroups();
        if (groupDropdown) {
            groupDropdown.value = group.id;
            loadTasks();
        }
      }).catch(error => {
        console.error('Error adding group:', error);
        alert(`Failed to add group: ${error.message}`);
      });
    });
  } else if (groupName !== null) {
      alert("Group name cannot be blank.");
  }
}

// UI state management functions
function showMainScreen() {
    mainForm.classList.remove('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.add('hidden-element');
    taskManager.classList.add('hidden-element');
    
    // Attempt to play video when main screen is shown
    if (splashVideo) {
        splashVideo.play().catch(e => console.warn("Video autoplay prevented on showMainScreen:", e));
    }
}

function showLoginForm() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.remove('hidden-element');
    signupForm.classList.add('hidden-element');
    taskManager.classList.add('hidden-element');
    if (splashVideo) splashVideo.pause(); // Pause video when navigating away
}

function showSignupForm() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.remove('hidden-element');
    taskManager.classList.add('hidden-element');
    if (splashVideo) splashVideo.pause(); // Pause video when navigating away
}

function showTaskManager() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.add('hidden-element');
    taskManager.classList.remove('hidden-element');
    if (splashVideo) splashVideo.pause(); // Pause video when navigating away
}


// Main DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    // Get all HTML element references
    mainForm = document.getElementById('main-form');
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    taskManager = document.getElementById('task-manager');
    splashVideo = document.getElementById('splash-video'); // Get reference to video

    loginBtn = document.getElementById('login-btn');
    signupBtn = document.getElementById('signup-btn');
    submitLoginBtn = document.getElementById('submit-login-btn');
    submitSignupBtn = document.getElementById('submit-signup-btn');
    backToMainBtn = document.getElementById('back-to-main');
    backToMain2Btn = document.getElementById('back-to-main-2');
    
    loginUsernameInput = document.getElementById('login-username');
    loginPasswordInput = document.getElementById('login-password');
    signupUsernameInput = document.getElementById('signup-username');
    signupPasswordInput = document.getElementById('signup-password');

    addTaskBtn = document.getElementById('add-task-btn');
    taskInput = document.getElementById('task-input');
    taskList = document.getElementById('task-list');
    groupDropdown = document.getElementById('group-dropdown');
    addGroupBtn = document.getElementById('add-group-btn');
    deleteGroupBtn = document.getElementById('delete-group-btn');
    logoutBtn = document.getElementById('logout-btn');

    // Attach all event listeners
    if (loginBtn) loginBtn.addEventListener('click', showLoginForm);
    if (signupBtn) signupBtn.addEventListener('click', showSignupForm);
    if (submitLoginBtn) submitLoginBtn.addEventListener('click', handleLogin);
    if (submitSignupBtn) submitSignupBtn.addEventListener('click', handleRegister);
    if (backToMainBtn) backToMainBtn.addEventListener('click', showMainScreen);
    if (backToMain2Btn) backToMain2Btn.addEventListener('click', showMainScreen);
    
    if (addTaskBtn) addTaskBtn.addEventListener('click', handleAddTask);
    if (addGroupBtn) addGroupBtn.addEventListener('click', handleAddGroup);
    if (groupDropdown) groupDropdown.addEventListener('change', () => loadTasks());
    if (deleteGroupBtn) deleteGroupBtn.addEventListener('click', handleDeleteGroup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Initial check for a stored token
    getToken().then(token => {
        if (token) {
            showTaskManager(); // Show task manager directly
            loadGroups();
            loadTasks();
        } else {
            showMainScreen(); // Show main screen with video
        }
    });
});