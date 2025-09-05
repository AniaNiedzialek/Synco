// Get a reference to the button, the input field, and the task list
const addTaskBtn = document.getElementById('add-task-btn');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');

// Function to create a task element with a remove button
function createTaskElement(taskText) {
  const newTask = document.createElement('li');
  
  // Create a span for the task text
  const taskSpan = document.createElement('span');
  taskSpan.textContent = taskText;
  newTask.appendChild(taskSpan);

  // Create a button to remove the task
  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'x';
  removeBtn.classList.add('remove-btn'); // We'll style this later with CSS
  newTask.appendChild(removeBtn);

  // Add a click listener to the remove button
  removeBtn.addEventListener('click', () => {
    // Get the current list of tasks from storage
    chrome.storage.sync.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const updatedTasks = tasks.filter(t => t !== taskText);
      chrome.storage.sync.set({ 'tasks': updatedTasks }, () => {
        // Remove the task from the list in the popup
        newTask.remove();
      });
    });
  });

  return newTask;
}

// Load tasks when the popup is opened
window.onload = function() {
  chrome.storage.sync.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    tasks.forEach(taskText => {
      const taskElement = createTaskElement(taskText);
      taskList.appendChild(taskElement);
    });
  });
};

// Add a 'click' event listener to the button
addTaskBtn.addEventListener('click', () => {
  const taskText = taskInput.value.trim();
  if (taskText !== '') {
    // Get the current list of tasks from storage
    chrome.storage.sync.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      tasks.push(taskText);
      chrome.storage.sync.set({ 'tasks': tasks });
    });

    const taskElement = createTaskElement(taskText);
    taskList.appendChild(taskElement);
    taskInput.value = '';
  }
});