// Global API URL
const API_URL = 'http://127.0.0.1:8000/api/';
const TOKEN_KEY = 'authToken';
const SELECTED_GROUP_KEY = 'selectedGroup';

// UI Elements
const mainForm = document.getElementById('main-form');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const taskManager = document.getElementById('task-manager');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const signupUsernameInput = document.getElementById('signup-username');
const signupPasswordInput = document.getElementById('signup-password');
const taskInput = document.getElementById('task-input');
const priorityDropdown = document.getElementById('priority-dropdown');
const taskList = document.getElementById('task-list');
const groupDropdown = document.getElementById('group-dropdown');
const splashVideo = document.getElementById('splash-video');
const groupMembersModal = document.getElementById('group-members-modal');
const memberUsernameInput = document.getElementById('member-username-input');
const groupMembersList = document.getElementById('group-members-list');
const modalGroupName = document.getElementById('modal-group-name');
const groupMembersError = document.getElementById('group-members-error');

// Buttons
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const submitLoginBtn = document.getElementById('submit-login-btn');
const submitSignupBtn = document.getElementById('submit-signup-btn');
const backToMainBtn = document.getElementById('back-to-main');
const backToMain2Btn = document.getElementById('back-to-main-2');
const addTaskBtn = document.getElementById('add-task-btn');
const addGroupBtn = document.getElementById('add-group-btn');
const deleteGroupBtn = document.getElementById('delete-group-btn');
const logoutBtn = document.getElementById('logout-btn');
const manageMembersBtn = document.getElementById('manage-members-btn');
const closeMemberModalBtn = document.querySelector('#group-members-modal .close-button');
const addMemberBtn = document.getElementById('add-member-btn');

// Event Listeners
loginBtn.addEventListener('click', () => showLoginForm());
signupBtn.addEventListener('click', () => showSignupForm());
backToMainBtn.addEventListener('click', () => showMainForm());
backToMain2Btn.addEventListener('click', () => showMainForm());
submitLoginBtn.addEventListener('click', handleLogin);
submitSignupBtn.addEventListener('click', handleRegister);
addTaskBtn.addEventListener('click', handleAddTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
});
groupDropdown.addEventListener('change', handleGroupChange);
addGroupBtn.addEventListener('click', handleAddGroup);
deleteGroupBtn.addEventListener('click', handleDeleteGroup);
logoutBtn.addEventListener('click', handleLogout);
manageMembersBtn.addEventListener('click', showGroupMembersModal);
closeMemberModalBtn.addEventListener('click', closeGroupMembersModal);
addMemberBtn.addEventListener('click', handleAddMember);

// Initial check on popup load
document.addEventListener('DOMContentLoaded', () => {
    getToken().then(() => {
        showTaskManager();
        loadGroups();
    }).catch(() => {
        showMainForm();
        splashVideo.play();
    });
});

// Helper function to get token
function getToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([TOKEN_KEY], function(result) {
            if (result[TOKEN_KEY]) {
                resolve(result[TOKEN_KEY]);
            } else {
                reject('No token found');
            }
        });
    });
}

// UI State Management
function showMainForm() {
    mainForm.classList.remove('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.add('hidden-element');
    taskManager.classList.add('hidden-element');
    splashVideo.play();
}

function showLoginForm() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.remove('hidden-element');
    signupForm.classList.add('hidden-element');
}

function showSignupForm() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.remove('hidden-element');
}

function showTaskManager() {
    mainForm.classList.add('hidden-element');
    loginForm.classList.add('hidden-element');
    signupForm.classList.add('hidden-element');
    taskManager.classList.remove('hidden-element');
    splashVideo.pause();
    splashVideo.currentTime = 0;
}

// Authentication Handlers
function handleLogin(event) {
    event.preventDefault();
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;
    fetch(`${API_URL}api-token-auth/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (!response.ok) {
            alert('Login failed. Please check your username and password.');
            throw new Error('Login failed');
        }
        return response.json();
    })
    .then(data => {
        chrome.storage.local.set({ [TOKEN_KEY]: data.token }, function() {
            showTaskManager();
            loadGroups();
        });
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function handleRegister(event) {
    event.preventDefault();
    const username = signupUsernameInput.value;
    const password = signupPasswordInput.value;
    if (!username || !password) {
        alert("Username and password are required.");
        return;
    }
    fetch(`${API_URL}register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    }).then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                let errorMsg = "Registration failed.";
                if (err.username) errorMsg += ` Username: ${err.username.join(', ')}`;
                if (err.password) errorMsg += ` Password: ${err.password.join(', ')}`;
                alert(errorMsg);
                throw new Error('Registration failed');
            });
        }
        return response.json();
    })
    .then(data => {
        alert(`User "${username}" registered successfully! Please log in.`);
        signupUsernameInput.value = '';
        signupPasswordInput.value = '';
        showLoginForm();
    })
    .catch(error => {
        console.error('Error during registration:', error);
        if (error.message.includes('Failed to fetch')) {
          alert('Network error. Is the Django server running?');
        }
    });
}

function handleLogout() {
    chrome.storage.local.remove(TOKEN_KEY, function() {
        showMainForm();
        alert('You have been logged out.');
        groupDropdown.innerHTML = '';
        taskList.innerHTML = '';
    });
}

// Task & Group Management
function handleAddTask() {
    const text = taskInput.value.trim();
    if (text === '') return;
    const selectedGroup = groupDropdown.value;
    const priority = priorityDropdown.value;

    const body = {
        text: text,
        priority: priority
    };
    if (selectedGroup !== 'personal') {
        body.group = selectedGroup;
    }
    getToken().then(token => {
        fetch(`${API_URL}tasks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify(body),
        })
        .then(response => response.json())
        .then(task => {
            const newTaskElement = createTaskElement(task);
            taskList.appendChild(newTaskElement);
            taskInput.value = '';
            priorityDropdown.value = 'medium';
        })
        .catch(error => console.error('Error adding task:', error));
    }).catch(error => console.error(error));
}

function handleCompleteTask(task, checkbox) {
    getToken().then(token => {
        fetch(`${API_URL}tasks/${task.id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ completed: checkbox.checked }),
        })
        .then(response => response.json())
        .then(updatedTask => {
            const taskSpan = checkbox.nextElementSibling;
            if (updatedTask.completed) {
                taskSpan.classList.add('completed');
            } else {
                taskSpan.classList.remove('completed');
            }
        })
        .catch(error => console.error('Error completing task:', error));
    }).catch(error => console.error(error));
}

function handleAddGroup() {
    const groupName = prompt("Enter a name for the new group:");
    if (!groupName || groupName.trim() === "") return;
    getToken().then(token => {
        fetch(`${API_URL}groups/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ name: groupName }),
        })
        .then(response => response.json())
        .then(newGroup => {
            const newOption = document.createElement('option');
            newOption.value = newGroup.id;
            newOption.textContent = newGroup.name;
            groupDropdown.appendChild(newOption);
            groupDropdown.value = newGroup.id;
            loadTasks();
        })
        .catch(error => console.error('Error adding group:', error));
    }).catch(error => console.error(error));
}

function handleDeleteGroup() {
    const selectedGroupId = groupDropdown.value;
    if (selectedGroupId === 'personal') {
        alert("The 'Personal' group cannot be deleted.");
        return;
    }
    if (confirm("Are you sure you want to delete this group and all its tasks?")) {
        getToken().then(token => {
            fetch(`${API_URL}groups/${selectedGroupId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${token}`
                },
            })
            .then(response => {
                if (response.ok) {
                    alert("Group deleted successfully.");
                    loadGroups();
                } else {
                    alert("Failed to delete group. You may not have permission.");
                }
            })
            .catch(error => console.error('Error deleting group:', error));
        }).catch(error => console.error(error));
    }
}

function handleGroupChange() {
    const selectedGroup = groupDropdown.value;
    chrome.storage.local.set({ [SELECTED_GROUP_KEY]: selectedGroup }, function() {
        loadTasks();
    });
}

function loadGroups() {
    getToken().then(token => {
        fetch(`${API_URL}groups/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`
            },
        })
        .then(response => response.json())
        .then(groups => {
            groupDropdown.innerHTML = '';
            const personalOption = document.createElement('option');
            personalOption.value = 'personal';
            personalOption.textContent = 'Personal';
            groupDropdown.appendChild(personalOption);
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupDropdown.appendChild(option);
            });
            chrome.storage.local.get([SELECTED_GROUP_KEY], function(result) {
                const storedGroup = result[SELECTED_GROUP_KEY];
                if (storedGroup && (storedGroup === 'personal' || groups.some(g => g.id == storedGroup))) {
                    groupDropdown.value = storedGroup;
                } else {
                    groupDropdown.value = 'personal';
                }
                loadTasks();
            });
        })
        .catch(error => console.error('Error loading groups:', error));
    }).catch(() => {
        showMainForm();
    });
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.setAttribute('data-task-id', task.id);
    li.setAttribute('data-group-id', task.group);

    if (task.priority) {
        li.classList.add(`priority-${task.priority}`);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.classList.add('task-checkbox');
    checkbox.addEventListener('change', () => handleCompleteTask(task, checkbox));

    const span = document.createElement('span');
    span.textContent = task.text;
    span.classList.add('task-text');
    if (task.completed) {
        span.classList.add('completed');
    }
    span.addEventListener('click', () => activateTaskEdit(task, span));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.classList.add('remove-btn');
    removeBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(removeBtn);
    
    return li;
}

function deleteTask(taskId) {
    getToken().then(token => {
        fetch(`${API_URL}tasks/${taskId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Token ${token}`
            },
        })
        .then(response => {
            if (response.ok) {
                document.querySelector(`li[data-task-id="${taskId}"]`).remove();
            } else {
                alert("Failed to delete task. You may not have permission.");
            }
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            alert("Error deleting task.");
        });
    }).catch(error => console.error(error));
}

function loadTasks() {
    getToken().then(token => {
        const selectedGroupId = groupDropdown.value;
        
        let url = `${API_URL}tasks/`;
        if (selectedGroupId === 'personal') {
            url += '?group__isnull=True';
        } else if (selectedGroupId && selectedGroupId !== 'undefined') {
            url += `?group=${selectedGroupId}`;
        }
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Failed to load tasks.');
                });
            }
            return response.json();
        })
        .then(tasks => {
            taskList.innerHTML = '';
            tasks.forEach(task => {
                const newTaskElement = createTaskElement(task);
                taskList.appendChild(newTaskElement);
            });
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            const taskError = document.getElementById('task-error');
            if (error.message.includes('expected a number but got \'undefined\'')) {
                 taskError.textContent = "Please select a group to view tasks.";
            } else {
                taskError.textContent = error.message;
            }
            taskError.classList.remove('hidden-element');
        });
    }).catch(error => {
        console.error("Token not found, please log in.");
        showMainForm();
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

function showGroupMembersModal() {
    const selectedGroupId = groupDropdown.value;
    if (selectedGroupId === 'personal') {
        alert("Cannot manage members for the 'Personal' group.");
        return;
    }

    const selectedGroupName = groupDropdown.options[groupDropdown.selectedIndex].textContent;
    modalGroupName.textContent = selectedGroupName;

    groupMembersModal.classList.remove('hidden-element');
    loadGroupMembers(selectedGroupId);
    groupMembersError.classList.add('hidden-element');
}

function closeGroupMembersModal() {
    groupMembersModal.classList.add('hidden-element');
    memberUsernameInput.value = '';
    groupMembersList.innerHTML = '';
    groupMembersError.classList.add('hidden-element');
}

function createMemberListItem(member) {
    const li = document.createElement('li');
    li.setAttribute('data-member-id', member.id);
    li.textContent = member.username;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.classList.add('remove-member-btn');
    removeBtn.addEventListener('click', () => handleRemoveMember(member.username, li));
    
    li.appendChild(removeBtn);
    return li;
}

function loadGroupMembers(groupId) {
    getToken().then(token => {
        fetch(`${API_URL}groups/${groupId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Failed to load group members.');
                });
            }
            return response.json();
        })
        .then(groupData => {
            groupMembersList.innerHTML = '';
            groupData.members.forEach(member => {
                const memberItem = createMemberListItem(member);
                groupMembersList.appendChild(memberItem);
            });
        })
        .catch(error => {
            console.error('Error loading group members:', error);
            groupMembersError.textContent = error.message;
            groupMembersError.classList.remove('hidden-element');
        });
    }).catch(error => {
        console.error("Token not found, please log in.");
        showMainForm();
    });
}

function handleAddMember() {
    const selectedGroupId = groupDropdown.value;
    const username = memberUsernameInput.value.trim();
    if (!username) {
        groupMembersError.textContent = "Please enter a username.";
        groupMembersError.classList.remove('hidden-element');
        return;
    }

    getToken().then(token => {
        fetch(`${API_URL}groups/${selectedGroupId}/members/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ username: username }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Failed to add member.');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            memberUsernameInput.value = '';
            groupMembersError.classList.add('hidden-element');
            loadGroupMembers(selectedGroupId);
        })
        .catch(error => {
            console.error('Error adding member:', error);
            groupMembersError.textContent = error.message;
            groupMembersError.classList.remove('hidden-element');
        });
    }).catch(error => {
        console.error(error);
        groupMembersError.textContent = "Authentication error. Please log in.";
        groupMembersError.classList.remove('hidden-element');
    });
}
function updatePriorityIcon() {
    const selectedPriority = priorityDropdown.value;
    priorityIcon.textContent = 'priority_high'; 
    priorityIcon.className = 'material-symbols-rounded'; // Ensure base class is always there

    switch (selectedPriority) {
        case 'low':
            priorityIcon.classList.add('icon-low');
            break;
        case 'medium':
            priorityIcon.classList.add('icon-medium');
            break;
        case 'high':
            priorityIcon.classList.add('icon-high');
            break;
    }
}

function handleRemoveMember(username, listItemElement) {
    const selectedGroupId = groupDropdown.value;
    getToken().then(token => {
        fetch(`${API_URL}groups/${selectedGroupId}/members/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ username: username }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Failed to remove member.');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            listItemElement.remove();
            groupMembersError.classList.add('hidden-element');
        })
        .catch(error => {
            console.error('Error removing member:', error);
            groupMembersError.textContent = error.message;
            groupMembersError.classList.remove('hidden-element');
        });
    }).catch(error => {
        console.error(error);
        groupMembersError.textContent = "Authentication error. Please log in.";
        groupMembersError.classList.remove('hidden-element');
    });
}