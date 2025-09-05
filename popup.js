// Get a reference to the login form elements
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');

// Get a reference to the task manager elements
const taskManager = document.getElementById('task-manager');
const addTaskBtn = document.getElementById('add-task-btn');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');

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
  newTask.appendChild(taskSpan);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'x';
  removeBtn.classList.add('remove-btn');
  newTask.appendChild(removeBtn);

  removeBtn.addEventListener('click', () => {
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
          console.error('Failed to delete task');
          alert('Failed to delete task. You might not be logged in or have permission.');
        }
      }).catch(error => {
        console.error('Network error on delete:', error);
        alert('Network error on delete.');
      });
    });
  });

  return newTask;
}

// Function to load tasks from the API
function loadTasks() {
  getToken().then(token => {
    if (!token) {
      // No token, show login form
      loginForm.style.display = 'block';
      taskManager.style.display = 'none';
      return;
    }

    fetch(`${API_URL}tasks/`, {
      headers: {
        'Authorization': `Token ${token}`
      },
    })
    .then(response => {
      if (response.status === 401) {
        // Token is invalid, show login form
        loginForm.style.display = 'block';
        taskManager.style.display = 'none';
        chrome.storage.sync.set({ 'authToken': null }); // Clear invalid token
        return Promise.reject('Unauthorized');
      }
      return response.json();
    })
    .then(tasks => {
      taskList.innerHTML = ''; // Clear the list
      tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
      });
    })
    .catch(error => {
      console.error('Error loading tasks:', error);
      // If unauthorized, the login form is already shown, so no alert needed.
      if (error !== 'Unauthorized') {
        alert('Error loading tasks. Please try logging in again.');
        loginForm.style.display = 'block';
        taskManager.style.display = 'none';
      }
    });
  });
}

// Add a 'click' event listener to the add task button
addTaskBtn.addEventListener('click', () => {
  const taskText = taskInput.value.trim();
  if (taskText !== '') {
    getToken().then(token => {
      fetch(`${API_URL}tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ text: taskText }),
      }).then(response => response.json())
        .then(task => {
          const taskElement = createTaskElement(task);
          taskList.appendChild(taskElement);
          taskInput.value = '';
        })
        .catch(error => {
          console.error('Error adding task:', error);
          alert('Failed to add task. Please check if you are logged in.');
        });
    });
  }
});

// Add a 'click' event listener to the login button
loginBtn.addEventListener('click', () => {
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
          loginForm.style.display = 'none';
          taskManager.style.display = 'block';
          loadTasks(); // Load tasks after successful login
        });
      }
    })
    .catch(error => console.error('Error during login:', error));
});

// Check for existing token on startup
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
});