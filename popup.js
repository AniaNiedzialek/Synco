// Global references for all HTML elements - declared but not assigned yet
let loginForm;
let usernameInput;
let passwordInput;
let loginBtn;

let taskManager;
let addTaskBtn;
let taskInput;
let taskList;
let groupDropdown;
let addGroupBtn;

// The base URL of our Django API.
const API_URL = 'http://127.0.0.1:8000/api/';

// Helper function to get the authentication token
function getToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['authToken'], (result) => {
      resolve(result.authToken);
    });
  });
}

// Helper function to create a task element with a remove button
function createTaskElement(task) {
  const newTask = document.createElement('li');
  const taskSpan = document.createElement('span');
  taskSpan.textContent = task.text;
  taskSpan.classList.add('task-text'); // Add a class for styling/targeting
  newTask.appendChild(taskSpan);
  
  taskSpan.addEventListener('click', () => activateTaskEdit(task, taskSpan));

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

// Activates in-line editing for a task
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
            const dataToUpdate = { text: newText };
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

// ✨ THE FIX: FUNCTION TO LOAD TASKS FROM THE API, NOW WITH FILTERING ✨
function loadTasks() {
  getToken().then(token => {
    if (!token) {
      if (loginForm && taskManager) {
        loginForm.style.display = 'block';
        taskManager.style.display = 'none';
      }
      return;
    }
    
    // Get the currently selected group ID
    const selectedGroupId = groupDropdown.value;

    let url = `${API_URL}tasks/`;
    // Add a filter parameter to the URL based on the selected group
    if (selectedGroupId) {
      url += `?group=${selectedGroupId}`;
    } else {
      url += `?group__isnull=True`; // DRF filter for null group
    }

    fetch(url, {
      headers: {
        'Authorization': `Token ${token}`
      },
    })
    .then(response => {
      if (response.status === 401) {
        chrome.storage.sync.set({ 'authToken': null }, () => {
          if (loginForm && taskManager) {
            loginForm.style.display = 'block';
            taskManager.style.display = 'none';
          }
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
        if (loginForm && taskManager) {
          loginForm.style.display = 'block';
          taskManager.style.display = 'none';
        }
      }
    });
  });
}

// Function to load groups from the API
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

// Event handlers
function handleLogin() {
  const username = usernameInput.value;
  const password = passwordInput.value;

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
          if (loginForm && taskManager) {
            loginForm.style.display = 'none';
            taskManager.style.display = 'block';
          }
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

// Main initialization logic - runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loginForm = document.getElementById('login-form');
  usernameInput = document.getElementById('username');
  passwordInput = document.getElementById('password');
  loginBtn = document.getElementById('login-btn');

  taskManager = document.getElementById('task-manager');
  addTaskBtn = document.getElementById('add-task-btn');
  taskInput = document.getElementById('task-input');
  taskList = document.getElementById('task-list');
  groupDropdown = document.getElementById('group-dropdown');
  addGroupBtn = document.getElementById('add-group-btn');

  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (addTaskBtn) addTaskBtn.addEventListener('click', handleAddTask);
  if (addGroupBtn) addGroupBtn.addEventListener('click', handleAddGroup);
  
  // ✨ THE FIX: We now call loadTasks() without an event argument
  if (groupDropdown) groupDropdown.addEventListener('change', () => loadTasks());

  chrome.storage.sync.set({ 'authToken': null }, () => {
    getToken().then(token => {
      if (token) {
        if (loginForm && taskManager) {
          loginForm.style.display = 'none';
          taskManager.style.display = 'block';
        }
        loadGroups();
        loadTasks();
      } else {
        if (loginForm && taskManager) {
          loginForm.style.display = 'block';
          taskManager.style.display = 'none';
        }
      }
    });
  });
});