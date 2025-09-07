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
const taskList = document.getElementById('task-list');
const groupDropdown = document.getElementById('group-dropdown');
const splashVideo = document.getElementById('splash-video');
const groupMembersModal = document.getElementById('group-members-modal');
const memberUsernameInput = document.getElementById('member-username-input');
const groupMembersList = document.getElementById('group-members-list');
const modalGroupName = document.getElementById('modal-group-name');

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
const groupMembersError = document.getElementById('group-members-error');

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
    const body = {
        text: text
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
            loadTasks(); // Load tasks for the new group
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
                    loadGroups(); // Reload groups to update dropdown
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
                option.textContent = group.name; // ✨ Use group.name for display
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


function loadTasks() {
    const selectedGroupId = groupDropdown.value;
    let url = `${API_URL}tasks/`;
    if (selectedGroupId === 'personal') {
        url += '?group__isnull=True';
    } else {
        url += `?group=${selectedGroupId}`;
    }
    getToken().then(token => {
        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`
            },
        })
        .then(response => {
            if (response.status === 403 || response.status === 404) {
                // Not a member of this group, go back to personal
                alert("You are no longer a member of this group. Switching to Personal tasks.");
                groupDropdown.value = 'personal';
                loadTasks();
                return { tasks: [] }; // Return empty to prevent errors
            }
            return response.json();
        })
        .then(tasks => {
            taskList.innerHTML = '';
            if (tasks.detail) {
                console.error("Error from API:", tasks.detail);
                return;
            }
            tasks.forEach(task => {
                const newTaskElement = createTaskElement(task);
                taskList.appendChild(newTaskElement);
            });
        })
        .catch(error => console.error('Error loading tasks:', error));
    }).catch(error => {
        console.error("Not authenticated, showing main form:", error);
        showMainForm();
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
        alert("The 'Personal' group cannot have members to manage.");
        return;
    }
    const selectedGroupName = groupDropdown.options[groupDropdown.selectedIndex].textContent;
    modalGroupName.textContent = selectedGroupName;
    groupMembersModal.classList.remove('hidden-element');
    loadGroupMembers(selectedGroupId);
}

function closeGroupMembersModal() {
    groupMembersModal.classList.add('hidden-element');
    groupMembersError.classList.add('hidden-element');
}

// ... (rest of your popup.js code)

function loadGroupMembers(groupId) {
    getToken().then(token => {
        fetch(`${API_URL}groups/${groupId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to load group details.');
            return response.json();
        })
        .then(group => {
            groupMembersList.innerHTML = '';
            // Make sure the current user cannot remove themselves from the list via the 'x' button
            const currentUserUsername = group.members.find(member => member === group.owner_username); // Assuming 'owner_username' is available (if you want to prevent owner removal)
            
            group.members.forEach(memberUsername => { // Iterate directly over usernames
                const memberElement = document.createElement('li');
                memberElement.textContent = memberUsername; // Display the username directly

                // Don't show remove button for the current user (if logged in as that user) or for the group owner
                // This check needs the current logged-in username, which we don't have easily here.
                // For simplicity, we'll allow removing anyone for now and let the backend handle owner-specific rules.
                // You cannot remove yourself from a group this way - this rule is handled by the backend.
                // However, we can prevent showing the remove button for the *currently logged-in user*.
                getToken().then(currentToken => { // Fetch token to identify current user (less ideal but works)
                    // You might need a way to get the current logged-in username here.
                    // For now, let's assume `request.user` in the backend is the ultimate authority.
                    // We'll just prevent the owner from being removed for visual consistency if possible.
                    // (This part is tricky without an explicit "get current user" endpoint.)
                    
                    // Simple check: If the member listed is the current token's owner, don't show the remove button
                    // A better way would be to fetch current user's username separately.
                    // For now, let's allow removing anyone, and backend will block self-removal.
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'x';
                    removeBtn.classList.add('remove-member-btn');
                    removeBtn.addEventListener('click', () => handleRemoveMember(groupId, memberUsername)); // Pass username
                    memberElement.appendChild(removeBtn);
                });
                groupMembersList.appendChild(memberElement);
            });
        })
        .catch(error => {
            console.error('Error loading group members:', error);
            groupMembersError.textContent = "Failed to load group members. " + error.message;
            groupMembersError.classList.remove('hidden-element');
        });
    });
}

function handleAddMember() {
    const username = memberUsernameInput.value.trim();
    if (!username) {
        alert("Please enter a username to add.");
        return;
    }
    const selectedGroupId = groupDropdown.value;
    getToken().then(token => {
        fetch(`${API_URL}groups/${selectedGroupId}/members/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => {
            if (response.ok) {
                alert(`User "${username}" added successfully!`);
                memberUsernameInput.value = '';
                loadGroupMembers(selectedGroupId);
            } else {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to add member.');
                });
            }
        })
        .catch(error => {
            alert(error.message);
            console.error('Error adding member:', error);
            groupMembersError.textContent = error.message;
            groupMembersError.classList.remove('hidden-element');
        });
    });
}

function handleRemoveMember(groupId, memberUsername) { // Accept memberUsername
    if (confirm(`Are you sure you want to remove "${memberUsername}" from this group?`)) {
        getToken().then(token => {
            fetch(`${API_URL}groups/${groupId}/members/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({ username: memberUsername }) // Send username for DELETE
            })
            .then(response => {
                if (response.ok) {
                    alert(`"${memberUsername}" has been removed.`);
                    loadGroupMembers(groupId); // Reload members list
                } else {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to remove member.');
                    });
                }
            })
            .catch(error => {
                alert(error.message);
                console.error('Error removing member:', error);
                groupMembersError.textContent = error.message;
                groupMembersError.classList.remove('hidden-element');
            });
        });
    }
}

// ... (rest of your popup.js code)

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