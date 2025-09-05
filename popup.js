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
        }
      });
    });
  });

  return newTask;
}

// Function to load tasks from the API
function loadTasks() {
  getToken().then(token => {
    fetch(`${API_URL}tasks/`, {
      headers: {
        'Authorization': `Token ${token}`
      },
    })
    .then(response => response.json())
    .then(tasks => {
      taskList.innerHTML = ''; // Clear the list
      tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
      });
    })
    .catch(error => console.error('Error loading tasks:', error));
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
        .catch(error => console.error('Error adding task:', error));
    });
  }
});

// Add a 'click' event listener to the login button
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value;
  const password = passwordInput.value;

  fetch(`${API_URL}api-token-auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  }).then(response => response.json())
    .then(data => {
      if (data.token) {
        chrome.storage.sync.set({ 'authToken': data.token }, () => {
          loginForm.style.display = 'none';
          taskManager.style.display = 'block';
          loadTasks(); // Load tasks after successful login
        });
      } else {
        alert('Login failed. Please check your credentials.');
      }
    })
    .catch(error => console.error('Error during login:', error));
});

// Check for existing token on startup
window.onload = function() {
  getToken().then(token => {
    if (token) {
      loginForm.style.display = 'none';
      taskManager.style.display = 'block';
      loadTasks();
    }
  });
};