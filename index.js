document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll(".content-section");
  const sidebarItems = document.querySelectorAll(".sidebar nav ul li");
  const sectionTitle = document.getElementById("section-title");

  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      sidebarItems.forEach(i => i.classList.remove("active"));
      sections.forEach(s => s.classList.remove("active"));
      item.classList.add("active");
      const id = item.dataset.section;
      document.getElementById(id).classList.add("active");
      sectionTitle.textContent = item.innerText.trim();
      if (id === "calendar") initializeCalendar();
    });
  });

  let allEvents = [];
  let allClubs = [];

  // Load Events
  fetch("events.json")
    .then(r => r.json())
    .then(events => {
      const today = new Date();
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      const upcomingEvents = events.filter(ev => new Date(ev.date) >= today.setHours(0,0,0,0));
      allEvents = upcomingEvents;
      renderEventsList();
      updateDashboard();
    });

  // Load Clubs
  fetch("data/clubs.json")
    .then(r => r.json())
    .then(clubs => {
      allClubs = clubs.map(club => ({ ...club, joined: false }));
      renderClubsList();
      updateDashboard();
    });

  // Load Resources
  fetch("resources.json")
    .then(r => r.json())
    .then(resourcesData => {
      const modal = document.getElementById("resource-modal");
      const modalTitle = document.getElementById("modal-title");
      const resourceList = document.getElementById("resource-list");
      document.querySelectorAll(".resource-card button").forEach(btn => {
        btn.onclick = () => {
          const cat = btn.parentElement.dataset.category;
          modalTitle.textContent = cat;
          resourceList.innerHTML = "";
          resourcesData[cat].forEach(res => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${res.link}">${res.name}</a>`;
            resourceList.appendChild(li);
          });
          modal.style.display = "block";
        };
      });
      modal.querySelector(".close-button").onclick = () => modal.style.display = "none";
      window.onclick = e => { if (e.target == modal) modal.style.display = "none"; };
    });

  let calendar;

  // View Event Modal logic
  const viewModal = document.getElementById('view-event-modal');
  const closeViewBtn = document.getElementById('close-view-event-modal');
  closeViewBtn.onclick = () => { viewModal.style.display = 'none'; };
  window.addEventListener('click', (event) => {
    if (event.target == viewModal) viewModal.style.display = 'none';
  });

  function initializeCalendar() {
    const el = document.getElementById("calendar-container");
    if (el.dataset.init) return;
    el.dataset.init = true;
    calendar = new FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      events: allEvents.map(e => ({
        title: e.title,
        start: e.date,
        allDay: true,
        extendedProps: { details: e.details || "" }
      })),
      dateClick: function(info) {
        document.getElementById('add-event-modal').style.display = 'block';
        document.getElementById('event-date').value = info.dateStr;
      },
      eventClick: function(info) {
        document.getElementById('view-event-title').textContent = info.event.title;
        document.getElementById('view-event-date').textContent = new Date(info.event.start).toDateString();
        document.getElementById('view-event-details').textContent = info.event.extendedProps.details || "No details";
        viewModal.style.display = 'block';
      }
    });
    calendar.render();
  }

  // To-Do List
  let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const taskInput = document.getElementById("new-task");
  const addTaskBtn = document.getElementById("add-task");
  const tasksList = document.getElementById("tasks");
  function renderTasks() {
    tasksList.innerHTML = "";
    tasks.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span style="text-decoration:${t.done?"line-through":"none"}">${t.text}</span><button>✅</button><button>❌</button>`;
      li.querySelectorAll("button")[0].onclick = () => { t.done = !t.done; saveTasks(); };
      li.querySelectorAll("button")[1].onclick = () => { tasks.splice(i,1); saveTasks(); };
      tasksList.appendChild(li);
    });
    updateDashboard();
  }
  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
  }
  addTaskBtn.onclick = () => {
    if (taskInput.value.trim()) {
      tasks.push({text:taskInput.value.trim(),done:false});
      saveTasks();
      taskInput.value = "";
    }
  };
  document.getElementById("add-task").onclick = function() {
    let value = taskInput.value.trim();
    if (value) {
      // Capitalize the first letter
      value = value.charAt(0).toUpperCase() + value.slice(1);
      tasks.push({ text: value, done: false });
      localStorage.setItem("tasks", JSON.stringify(tasks));
      renderTasks();
      taskInput.value = "";
    }
  };
  renderTasks();

  function updateDashboard() {
    document.getElementById("stat-events").textContent = allEvents.length;
    document.getElementById("stat-clubs").textContent = allClubs.filter(c=>c.joined).length;
    document.getElementById("stat-tasks").textContent = `${tasks.filter(t=>t.done).length}/${tasks.length}`;
    const next = document.getElementById("dashboard-next-events-list");
    next.innerHTML = "";
    allEvents.slice(0,2).forEach(ev=>{
      const li=document.createElement("li");
      li.textContent = `${ev.title} (${new Date(ev.date).toDateString()})`;
      next.appendChild(li);
    });
  }

  const modal = document.getElementById('add-event-modal');
  const closeBtn = document.getElementById('close-event-modal');
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
  };

  document.getElementById('add-event-form').onsubmit = function(e) {
    e.preventDefault();
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    const details = document.getElementById('event-details').value;
    if (title && date) {
      const newEvent = { title, date, details };
      allEvents.push(newEvent);
      if (calendar) {
        calendar.addEvent({
          title: title,
          start: date,
          allDay: true,
          extendedProps: { details: details }
        });
      }
      renderEventsList();
      updateDashboard();
      modal.style.display = 'none';
      this.reset();
      showPopupMessage("Event added successfully!");
    }
  };

  function showPopupMessage(msg) {
    let popup = document.createElement("div");
    popup.textContent = msg;
    popup.style.position = "fixed";
    popup.style.bottom = "30px";
    popup.style.left = "50%";
    popup.style.transform = "translateX(-50%)";
    popup.style.background = "#2196f3";
    popup.style.color = "#fff";
    popup.style.padding = "12px 24px";
    popup.style.borderRadius = "6px";
    popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    popup.style.zIndex = 2000;
    popup.style.fontSize = "1rem";
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.remove();
    }, 2000);
  }

  document.querySelectorAll('.dashboard-actions button').forEach(btn => {
    btn.addEventListener('click', function() {
      const section = btn.getAttribute('data-section');
      const sidebarBtn = document.querySelector(`.sidebar nav li[data-section="${section}"]`);
      if (sidebarBtn) sidebarBtn.click();
    });
  });

  // Instantly show calendar section on page load
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('calendar').classList.add('active');
  document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
  document.querySelector('.sidebar nav li[data-section="calendar"]').classList.add('active');
  document.getElementById('section-title').textContent = "Calendar";
  initializeCalendar();

  function renderEventsList() {
    const list = document.getElementById("events-list");
    list.innerHTML = "";
    allEvents.forEach(ev => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <strong>${ev.title}</strong>
        <div class="event-description">${ev.description || ev.details || ""}</div>
        <div class="event-date">${new Date(ev.date).toDateString()}</div>
        <button class="add-to-calendar-btn">Add to Calendar</button>
      `;
      const btn = div.querySelector(".add-to-calendar-btn");
      let alreadyOnCalendar = false;
      if (calendar) {
        alreadyOnCalendar = calendar.getEvents().some(e =>
          e.title === ev.title && e.startStr === ev.date
        );
      }
      if (alreadyOnCalendar) {
        btn.style.display = "none";
      }
      btn.onclick = function() {
        if (calendar && !alreadyOnCalendar) {
          calendar.addEvent({
            title: ev.title,
            start: ev.date,
            allDay: true,
            extendedProps: { details: ev.description || ev.details || "" }
          });
          showPopupMessage(`"${ev.title}" successfully added to calendar!`);
          btn.style.display = "none";
          alreadyOnCalendar = true;
        }
      };
      list.appendChild(div);
    });
  }

  function renderClubsList() {
    const list = document.getElementById("clubs-list");
    list.innerHTML = "";
    allClubs.forEach((club, i) => {
      const div = document.createElement("div");
      div.className = "club-card";
      div.innerHTML = `
        <img src="${club.logo}" alt="${club.name} logo" />
        <strong>${club.name}</strong>
        <div class="club-description">${club.description}</div>
        <button class="join-club-btn"${club.joined ? ' disabled' : ''}>${club.joined ? "Joined" : "Join"}</button>
      `;
      const btn = div.querySelector(".join-club-btn");
      btn.onclick = function() {
        if (!club.joined) {
          allClubs[i].joined = true;
          showPopupMessage(`You joined ${club.name}!`);
          renderClubsList();
          updateDashboard();
        }
      };
      list.appendChild(div);
    });
  }

  // Load News
  fetch("news.json")
    .then(r => r.json())
    .then(newsItems => {
      renderNewsList(newsItems);
    });

  function renderNewsList(newsItems) {
    const list = document.getElementById("news-list");
    list.innerHTML = "";
    newsItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    newsItems.forEach(news => {
      const div = document.createElement("div");
      div.className = "news-card";
      div.innerHTML = `
        <strong>${news.title}</strong>
        <div class="news-date">${new Date(news.date).toDateString()}</div>
        <div class="news-content">${news.content}</div>
      `;
      list.appendChild(div);
    });
  }

  // Theme toggle
  const themeToggleBtn = document.getElementById("theme-toggle");
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem("dark-theme", isDark);
  });
  // Check theme on load
  const isDarkTheme = JSON.parse(localStorage.getItem("dark-theme"));
  if (isDarkTheme) {
    document.body.classList.add("dark-theme");
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }

  document.getElementById('theme-toggle').onclick = function() {
    document.body.classList.toggle('dark-mode');
    // Optionally swap icon
    const icon = this.querySelector('i');
    if(document.body.classList.contains('dark-mode')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  };
});