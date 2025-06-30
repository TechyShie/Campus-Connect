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
      allEvents = events.filter(ev => new Date(ev.date) >= today.setHours(0,0,0,0));
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
4    });

  let calendar;

  function initializeCalendar() {
    const el = document.getElementById("calendar-container");
    if (!el) return; // Prevent error if element not found
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
      dateClick(info) {
        document.getElementById('add-event-modal').style.display = 'block';
        document.getElementById('event-date').value = info.dateStr;
      },
      eventClick(info) {
        document.getElementById('view-event-title').textContent = info.event.title;
        document.getElementById('view-event-date').textContent = new Date(info.event.start).toDateString();
        document.getElementById('view-event-details').textContent = info.event.extendedProps.details || "No details";
        document.getElementById('view-event-modal').style.display = 'block';
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
  // Add task on button click
  addTaskBtn.onclick = () => {
    const value = taskInput.value.trim();
    if (value) {
      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
      tasks.push({ text: capitalized, done: false });
      localStorage.setItem("tasks", JSON.stringify(tasks));
      renderTasks();
      taskInput.value = "";
    }
  };
  // Add task on Enter key
  taskInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission if inside a form
      addTaskBtn.click();
    }
  });

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

  // Modals
  const modal = document.getElementById('add-event-modal');
  document.getElementById('close-event-modal').onclick = () => { modal.style.display = 'none'; };
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
          title,
          start: date,
          allDay: true,
          extendedProps: { details }
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
    const popup = document.createElement("div");
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
    setTimeout(() => popup.remove(), 2000);
  }

  function renderEventsList() {
    const list = document.getElementById("events-list");
    list.innerHTML = "";
    allEvents.forEach(ev => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <strong>${ev.title}</strong>
        <div class="event-description">${ev.details || ""}</div>
        <div class="event-date">${new Date(ev.date).toDateString()}</div>
        <button class="add-to-calendar-btn">Add to Calendar</button>
      `;
      const btn = div.querySelector(".add-to-calendar-btn");
      btn.onclick = () => {
        if (calendar) {
          calendar.addEvent({
            title: ev.title,
            start: ev.date,
            allDay: true,
            extendedProps: { details: ev.details }
          });
          btn.style.display = "none";
          showPopupMessage(`"${ev.title}" added to calendar!`);
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
      div.querySelector(".join-club-btn").onclick = () => {
        allClubs[i].joined = true;
        renderClubsList();
        updateDashboard();
        showPopupMessage(`You joined ${club.name}!`);
      };
      list.appendChild(div);
    });
  }

  // News via RSS
  const newsList = document.getElementById("news-list");
  const categorySelect = document.getElementById("news-category");

  function fetchNewsRSS(rssUrl) {
    newsList.innerHTML = "<p>Loading news...</p>";
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      .then(r => r.json())
      .then(data => {
        newsList.innerHTML = "";
        if (data.items && data.items.length) {
          data.items.forEach(article => {
            const div = document.createElement("div");
            div.className = "news-card";
            div.innerHTML = `
              <strong>${article.title}</strong>
              <div class="news-date">${new Date(article.pubDate).toDateString()}</div>
              <div class="news-content">${article.description || ""}</div>
              <a href="${article.link}" target="_blank">Read more</a>
            `;
            newsList.appendChild(div);
          });
        } else {
          newsList.innerHTML = "<p>No news articles found.</p>";
        }
      })
      .catch(err => {
        console.error("Error fetching news:", err);
        newsList.innerHTML = "<p>Error loading news.</p>";
      });
  }

  // Initial load
  fetchNewsRSS("https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml");

  categorySelect.addEventListener("change", () => {
    let rss;
    switch (categorySelect.value) {
      case "business":
        rss = "http://feeds.reuters.com/reuters/businessNews"; break;
      case "technology":
        rss = "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"; break;
      case "sports":
        rss = "http://feeds.bbci.co.uk/sport/rss.xml"; break;
      case "health":
        rss = "https://www.sciencedaily.com/rss/health_medicine.xml"; break;
      case "science":
        rss = "https://www.sciencedaily.com/rss/top.xml"; break;
      case "entertainment":
        rss = "https://www.npr.org/rss/rss.php?id=1008"; break;
      default:
        rss = "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml";
    }
    fetchNewsRSS(rss);
  });

  // Theme toggle
  const themeToggleBtn = document.getElementById("theme-toggle");
  themeToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem("dark-theme", isDark);
  });

  // Check saved theme
  const isDarkTheme = JSON.parse(localStorage.getItem("dark-theme"));
  if (isDarkTheme) {
    document.body.classList.add("dark-theme");
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }

  // Dashboard action buttons: make them navigate to the correct section
  document.querySelectorAll('.dashboard-actions button').forEach(btn => {
    btn.addEventListener('click', function() {
      const section = btn.getAttribute('data-section');
      if (!section) return;
      // Hide all sections
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
      // Show the selected section
      document.getElementById(section).classList.add('active');
      // Update sidebar active state
      document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
      const sidebarLi = document.querySelector(`.sidebar nav li[data-section="${section}"]`);
      4
