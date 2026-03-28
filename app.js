// Initialize Icons
if (typeof feather !== 'undefined') {
  feather.replace();
}

// Ensure theme is applied before rendering to avoid flashing
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  return savedTheme;
};

let currentTheme = initializeTheme();

// Auth Check for Protected Routes
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
  if (localStorage.getItem('isAuthenticated') !== 'true') {
    window.location.href = 'login.html';
  }
}

// Initial Dummy Data setup if first time
const initializeData = () => {
  if (!localStorage.getItem('tasks')) {
    const dummyData = [
      {
        id: '1',
        title: 'Complete Math Assignment',
        description: 'Exercises 1 through 10 on page 42. Make sure to double-check formulas.',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        priority: 'high',
        status: 'pending'
      },
      {
        id: '2',
        title: 'Read History Chapter 5',
        description: 'Focus on the causes of the industrial revolution and its global impact.',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days
        priority: 'medium',
        status: 'pending'
      },
      {
        id: '3',
        title: 'Submit Biology Lab Report',
        description: 'Upload PDF to student portal and submit physical copy during the lab.',
        dueDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], // 1 days ago
        priority: 'low',
        status: 'completed'
      }
    ];
    localStorage.setItem('tasks', JSON.stringify(dummyData));
  }
};

initializeData();

// App Logic (Only run if on dashboard)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }

  // If we are not on Dashboard, skip the rest
  if (!document.getElementById('tasksContainer')) return;
  
  // Theme Toggle logic
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  
  const updateThemeUI = (theme) => {
    if (theme === 'dark') {
      if(themeIcon) { themeIcon.setAttribute('data-feather', 'sun'); feather.replace(); }
      if(themeText) themeText.textContent = 'Light Mode';
    } else {
      if(themeIcon) { themeIcon.setAttribute('data-feather', 'moon'); feather.replace(); }
      if(themeText) themeText.textContent = 'Dark Mode';
    }
  };
  
  if (themeToggle) {
    updateThemeUI(currentTheme);
    
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
      updateThemeUI(currentTheme);
    });
  }
  
  // Mobile Sidebar Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const sidebar = document.getElementById('sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('isAuthenticated');
      window.location.href = 'login.html';
    });
  }

  // --- Navigation Logic ---
  const navItems = {
    dashboard: { link: document.getElementById('nav-dashboard'), view: document.getElementById('view-dashboard') },
    calendar: { link: document.getElementById('nav-calendar'), view: document.getElementById('view-calendar') },
    profile: { link: document.getElementById('nav-profile'), view: document.getElementById('view-profile') }
  };

  const switchView = (activeKey) => {
    Object.keys(navItems).forEach(key => {
      const item = navItems[key];
      if (item.link && item.view) {
        if (key === activeKey) {
          item.link.classList.add('active');
          item.view.style.display = 'block';
        } else {
          item.link.classList.remove('active');
          item.view.style.display = 'none';
        }
      }
    });

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar')?.classList.remove('open');
    }

    if (activeKey === 'calendar' && typeof window.renderCalendar === 'function') {
      window.renderCalendar();
    }
  };

  if (navItems.dashboard.link) navItems.dashboard.link.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
  if (navItems.calendar.link) navItems.calendar.link.addEventListener('click', (e) => { e.preventDefault(); switchView('calendar'); });
  if (navItems.profile.link) navItems.profile.link.addEventListener('click', (e) => { e.preventDefault(); switchView('profile'); });

  // --- Task Management Logic ---
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  
  // DOM Elements
  const tasksContainer = document.getElementById('tasksContainer');
  const emptyState = document.getElementById('emptyState');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  // Filters Elements
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const sortDate = document.getElementById('sortDate');
  
  // Modal Elements
  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelModal = document.getElementById('cancelModal');
  const modalTitle = document.getElementById('modalTitle');
  
  // Form Inputs
  const taskIdInput = document.getElementById('taskId');
  const titleInput = document.getElementById('taskTitle');
  const descInput = document.getElementById('taskDesc');
  const dateInput = document.getElementById('taskDate');
  const priorityInput = document.getElementById('taskPriority');
  
  // State
  let currentFilters = {
    search: '',
    status: 'all',
    priority: 'all',
    sort: 'dueSoon'
  };

  // Utility to generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  const saveTasks = () => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  };
  
  const updateProgress = () => {
    if (tasks.length === 0) {
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      return;
    }
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const percentage = Math.round((completedCount / tasks.length) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getBadgeClass = (priority) => {
    if (priority === 'low') return 'badge-low';
    if (priority === 'medium') return 'badge-med';
    if (priority === 'high') return 'badge-high';
    return '';
  };
  
  const renderTasks = () => {
    // Apply filters
    let filteredTasks = tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(currentFilters.search.toLowerCase()) || 
                          task.description.toLowerCase().includes(currentFilters.search.toLowerCase());
      const matchStatus = currentFilters.status === 'all' || task.status === currentFilters.status;
      const matchPriority = currentFilters.priority === 'all' || task.priority === currentFilters.priority;
      return matchSearch && matchStatus && matchPriority;
    });
    
    // Apply Sort
    filteredTasks.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      if (currentFilters.sort === 'dueSoon') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
    
    tasksContainer.innerHTML = '';
    
    if (filteredTasks.length === 0) {
      tasksContainer.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      tasksContainer.style.display = 'grid';
      emptyState.style.display = 'none';
      
      filteredTasks.forEach(task => {
        const isCompleted = task.status === 'completed';
        
        const card = document.createElement('div');
        card.className = `task-card ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
          <div class="task-header">
            <div>
              <h3 class="task-title">${task.title}</h3>
              <span class="badge ${getBadgeClass(task.priority)}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
              <span class="badge ${isCompleted ? 'badge-complete' : 'badge-pending'}" style="margin-left: 0.5rem;">${isCompleted ? 'Completed' : 'Pending'}</span>
            </div>
            
            <button class="task-complete-toggle" onclick="toggleTaskStatus('${task.id}')" title="Toggle Completion">
              <i data-feather="check" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
          
          <p class="task-desc">${task.description}</p>
          
          <div class="task-meta">
            <div class="flex items-center gap-1">
              <i data-feather="calendar" style="width: 14px; height: 14px;"></i>
              <span>${formatDate(task.dueDate)}</span>
            </div>
            
            <div class="task-actions">
              <button class="btn-icon" onclick="editTask('${task.id}')" title="Edit">
                <i data-feather="edit-2" style="width: 16px; height: 16px;"></i>
              </button>
              <button class="btn-icon" onclick="deleteTask('${task.id}')" style="color: var(--danger);" title="Delete">
                <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>
        `;
        tasksContainer.appendChild(card);
      });
      
      if (typeof feather !== 'undefined') feather.replace();
    }
    
    updateProgress();
    if (typeof window.renderCalendar === 'function' && navItems.calendar && navItems.calendar.view.style.display === 'block') {
      window.renderCalendar();
    }
  };
  
  // Expose global functions for inline handlers
  window.toggleTaskStatus = (id) => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex > -1) {
      tasks[taskIndex].status = tasks[taskIndex].status === 'completed' ? 'pending' : 'completed';
      saveTasks();
      renderTasks();
    }
  };
  
  window.deleteTask = (id) => {
    if(confirm('Are you sure you want to delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
    }
  };
  
  window.editTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      modalTitle.textContent = 'Edit Task';
      taskIdInput.value = task.id;
      titleInput.value = task.title;
      descInput.value = task.description;
      dateInput.value = task.dueDate;
      priorityInput.value = task.priority;
      
      taskModal.classList.add('active');
    }
  };
  
  // Modal Handlers
  const openModal = () => {
    modalTitle.textContent = 'Add New Task';
    taskForm.reset();
    taskIdInput.value = '';
    // Set default date to today
    dateInput.value = new Date().toISOString().split('T')[0];
    taskModal.classList.add('active');
  };
  
  const dismissModal = () => {
    taskModal.classList.remove('active');
  };
  
  addTaskBtn.addEventListener('click', openModal);
  closeModal.addEventListener('click', dismissModal);
  cancelModal.addEventListener('click', dismissModal);
  
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      dismissModal();
    }
  });
  
  // Form Submission
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = taskIdInput.value;
    const taskData = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      dueDate: dateInput.value,
      priority: priorityInput.value,
      status: 'pending' // Default for new, preserved for edits below
    };
    
    if (id) {
      // Edit existing
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex > -1) {
        taskData.status = tasks[taskIndex].status; // Preserve status
        tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
      }
    } else {
      // Add new
      taskData.id = generateId();
      tasks.push(taskData);
    }
    
    saveTasks();
    renderTasks();
    dismissModal();
  });
  
  // Filter Handlers
  searchInput.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderTasks();
  });
  
  filterStatus.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    renderTasks();
  });
  
  filterPriority.addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    renderTasks();
  });
  
  sortDate.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    renderTasks();
  });
  
  // Initial Render
  renderTasks();

  // --- Calendar Logic ---
  const calendarGrid = document.getElementById('calendarGrid');
  const currentMonthYear = document.getElementById('currentMonthYear');
  let calendarDate = new Date();

  window.renderCalendar = () => {
    if (!calendarGrid || !currentMonthYear) return;
    calendarGrid.innerHTML = '';

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    currentMonthYear.textContent = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Prev month padding
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.innerHTML = `<div class="date-num">${prevMonthDays - firstDay + i + 1}</div>`;
        calendarGrid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (isCurrentMonth && i === today.getDate()) {
            cell.classList.add('today');
        }

        // Find tasks for this day
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.dueDate === dayString);

        let dotsHtml = '';
        if (dayTasks.length > 0) {
            dotsHtml = `<div class="task-dots">`;
            dayTasks.forEach(task => {
                const pClass = task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low';
                dotsHtml += `<div class="task-dot ${pClass}">${task.title}</div>`;
            });
            dotsHtml += `</div>`;
        }

        cell.innerHTML = `
            <div class="date-num">${i}</div>
            ${dotsHtml}
        `;

        // Click to add task
        cell.addEventListener('click', () => {
             dateInput.value = dayString;
             openModal();
        });

        calendarGrid.appendChild(cell);
    }

    // Next month padding to fill grid
    const totalCells = firstDay + daysInMonth;
    const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 1; i <= nextDays; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.innerHTML = `<div class="date-num">${i}</div>`;
        calendarGrid.appendChild(cell);
    }
  };

  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
      window.renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
      window.renderCalendar();
    });
  }

  // --- Profile Logic ---
  const profileForm = document.getElementById('profileForm');
  const profileName = document.getElementById('profileName');
  const profileDisplayName = document.getElementById('profileDisplayName');
  const profileDisplayRole = document.getElementById('profileDisplayRole');
  const profileMajor = document.getElementById('profileMajor');

  if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
          e.preventDefault();
          if (profileName && profileDisplayName) {
              profileDisplayName.textContent = profileName.value;
          }
          if (profileMajor && profileDisplayRole) {
              profileDisplayRole.textContent = profileMajor.value;
          }
          alert('Profile saved successfully!');
      });
  }

});
