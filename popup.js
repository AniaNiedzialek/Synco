// get a refernce t the button and the task list
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('task-list');

// add a click event listener to the button
addTaskBtn.addEventListener('click', () => {
    // create a new lsit item for the task
    const newTask = document.createElement('li');
    newTask.textContent = 'New Task'; // placeholder text


    // add the new task to the list
    taskList.appendChild(newTask);
});
