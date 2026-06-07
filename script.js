// Modern Web Portfolio - Assep Wahid - Frontend Controller

document.addEventListener("DOMContentLoaded", () => {
  let portfolioData = null;

  // 1. Theme Switcher Logic
  const themeToggleBtn = document.getElementById("theme-toggle");
  const currentTheme = localStorage.getItem("theme") || "dark";
  
  document.body.setAttribute("data-theme", currentTheme);

  themeToggleBtn.addEventListener("click", () => {
    const activeTheme = document.body.getAttribute("data-theme");
    const newTheme = activeTheme === "dark" ? "light" : "dark";
    
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });

  // 2. Modal Overlay Logic
  const detailModal = document.getElementById("detail-modal");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalBody = document.getElementById("modal-body");

  function openModal(type, id) {
    if (!portfolioData) return;
    
    const items = type === "article" ? portfolioData.articles : portfolioData.projects;
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Build modal content html
    let actionButtons = "";
    
    // Add external link button if present
    if (type === "article" && item.url) {
      actionButtons += `<a href="${item.url}" target="_blank" class="btn btn-secondary" style="margin-top:0.5rem;">Baca di Medium</a>`;
    } else if (type === "project" && item.link) {
      actionButtons += `<a href="${item.link}" target="_blank" class="btn btn-secondary" style="margin-top:0.5rem;">GitHub / Source Code</a>`;
    }

    // Add document attachment download button if present
    if (item.attachment) {
      actionButtons += `<a href="${item.attachment}" target="_blank" class="btn btn-primary" style="margin-top:0.5rem;">Buka / Unduh File Dokumen</a>`;
    }

    // Format written content text into clean paragraphs
    let contentHtml = "";
    if (item.content) {
      contentHtml = item.content
        .split("\n\n")
        .map(para => `<p style="margin-bottom: 1.25rem;">${para.replace(/\n/g, "<br>")}</p>`)
        .join("");
    } else {
      contentHtml = `<p>${item.description}</p>`;
    }

    // Metadata layout
    let metaHtml = "";
    if (type === "article" && item.date) {
      const dateObj = new Date(item.date);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      metaHtml = `<div class="modal-meta-info">
        <span>Dipublikasikan: ${dateObj.toLocaleDateString('id-ID', options)}</span>
      </div>`;
    } else {
      metaHtml = `<div class="modal-meta-info">
        <span>Kategori: ${item.category}</span>
      </div>`;
    }

    // Image/Fallback preview in modal
    let mediaHtml = "";
    if (type === "project") {
      const initials = item.title.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
      if (item.image) {
        mediaHtml = `<div class="project-img-container" style="height:260px; margin-bottom: 2rem; border-radius:12px; border:1px solid var(--card-border);">
          <img src="${item.image}" alt="${item.title}" class="project-img" style="border-radius:12px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="project-fallback-gradient" style="display:none; height:100%; align-items:center; justify-content:center; font-family:var(--font-title); font-size:3rem; font-weight:800; color:white; border-radius:12px;">${initials}</div>
        </div>`;
      } else {
        mediaHtml = `<div class="project-img-container" style="height:260px; margin-bottom: 2rem; border-radius:12px;">
          <div class="project-fallback-gradient" style="display:flex; height:100%; align-items:center; justify-content:center; font-family:var(--font-title); font-size:3rem; font-weight:800; color:white; border-radius:12px;">${initials}</div>
        </div>`;
      }
    }

    modalBody.innerHTML = `
      <span class="modal-header-tag">${item.category}</span>
      <h2 class="modal-title">${item.title}</h2>
      ${metaHtml}
      ${mediaHtml}
      <div class="modal-desc-body">${contentHtml}</div>
      <div class="modal-footer-actions">${actionButtons}</div>
    `;

    detailModal.classList.add("show");
    document.body.style.overflow = "hidden"; // Disable background scrolling
  }

  function closeModal() {
    detailModal.classList.remove("show");
    document.body.style.overflow = ""; // Enable scrolling
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }

  // Close on backdrop click
  if (detailModal) {
    detailModal.addEventListener("click", (e) => {
      if (e.target === detailModal) closeModal();
    });
  }

  // Close on ESC keypress
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && detailModal.classList.contains("show")) {
      closeModal();
    }
  });

  // 3. Fetch Portfolio Data
  fetch("/api/data")
    .then(res => {
      if (!res.ok) throw new Error("API not available");
      return res.json();
    })
    .then(data => {
      portfolioData = data;
      initPortfolio(data);
    })
    .catch(err => {
      console.warn("API offline, fetching data.json directly:", err);
      fetch("data.json")
        .then(res => res.json())
        .then(data => {
          portfolioData = data;
          initPortfolio(data);
        })
        .catch(staticErr => {
          console.error("Could not load data.json", staticErr);
          loadHardcodedFallback();
        });
    });

  // 4. Initialize Portfolio Components
  function initPortfolio(data) {
    if (!data) return;

    // Load Profile Info
    if (data.profile) {
      const p = data.profile;
      document.getElementById("profile-name").textContent = p.name;
      document.getElementById("profile-bio").textContent = p.bio;
      document.getElementById("profile-univ").textContent = p.university;

      if (p.avatar) {
        document.getElementById("profile-avatar").src = p.avatar;
      }
      
      updateHref("profile-github", p.github);
      updateHref("profile-linkedin", p.linkedin);
      updateHref("profile-medium-url", p.medium);
      
      const emailBtn = document.getElementById("profile-email");
      if (emailBtn && p.email) {
        emailBtn.href = `mailto:${p.email}`;
      }
    }

    renderArticles("all");
    renderProjects("all");

    setupFilters("article-filters", renderArticles);
    setupFilters("project-filters", renderProjects);

    // Setup global delegation handler for card/trigger clicks to open the modal
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest(".view-detail-trigger");
      if (trigger) {
        const id = trigger.getAttribute("data-id");
        const type = trigger.getAttribute("data-type");
        
        // Find if this item has inline content or attachment files
        const items = type === "article" ? portfolioData.articles : portfolioData.projects;
        const item = items.find(i => i.id === id);
        
        if (item && (item.content || item.attachment)) {
          e.preventDefault();
          openModal(type, id);
        }
      }
    });

    initScrollReveal();
    initTypingAnimation();
  }

  function updateHref(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  }

  // 5. Render Articles
  function renderArticles(categoryFilter) {
    const container = document.getElementById("articles-container");
    if (!container || !portfolioData || !portfolioData.articles) return;

    container.innerHTML = "";
    const filtered = categoryFilter === "all" 
      ? portfolioData.articles 
      : portfolioData.articles.filter(a => a.category === categoryFilter);

    if (filtered.length === 0) {
      container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 3rem;">Belum ada artikel di kategori ini.</p>`;
      return;
    }

    filtered.forEach(article => {
      const card = document.createElement("article");
      card.className = "card";
      
      const dateObj = new Date(article.date);
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      const formattedDate = dateObj.toLocaleDateString('id-ID', options);

      // Determine action details
      const hasDetail = article.content || article.attachment;
      const readLabel = hasDetail ? "Buka Artikel" : "Baca di Medium";
      const targetAttr = hasDetail ? "" : 'target="_blank"';

      card.innerHTML = `
        <span class="card-tag">${article.category}</span>
        <h3 class="card-title">${article.title}</h3>
        <p class="card-desc">${article.description}</p>
        <div class="card-meta">
          <span>${formattedDate}</span>
          <a href="${article.url || '#'}" ${targetAttr} class="card-link view-detail-trigger" data-type="article" data-id="${article.id}">
            ${readLabel}
            <svg viewBox="0 0 24 24"><path d="M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5h7V3H5zm9 0v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </a>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // 6. Render Projects
  function renderProjects(categoryFilter) {
    const container = document.getElementById("projects-container");
    if (!container || !portfolioData || !portfolioData.projects) return;

    container.innerHTML = "";
    const filtered = categoryFilter === "all"
      ? portfolioData.projects
      : portfolioData.projects.filter(p => p.category === categoryFilter);

    if (filtered.length === 0) {
      container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 3rem;">Belum ada proyek di kategori ini.</p>`;
      return;
    }

    filtered.forEach(project => {
      const card = document.createElement("div");
      card.className = "card project-card";

      const initials = project.title.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

      const imageHtml = project.image 
        ? `<div class="project-img-container">
             <img src="${project.image}" alt="${project.title}" class="project-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="project-fallback-gradient" style="display:none; height:180px; align-items:center; justify-content:center; font-family:var(--font-title); font-size:2rem; font-weight:800; color:white; border-bottom: 1px solid var(--card-border);">${initials}</div>
           </div>`
        : `<div class="project-img-container">
             <div class="project-fallback-gradient" style="display:flex; height:180px; background:var(--accent-gradient); align-items:center; justify-content:center; font-family:var(--font-title); font-size:2rem; font-weight:800; color:white; border-bottom: 1px solid var(--card-border);">${initials}</div>
           </div>`;

      // Determine actions details
      const hasDetail = project.content || project.attachment;
      const viewLabel = hasDetail ? "Buka File Proyek" : "Lihat Proyek";
      const targetAttr = hasDetail ? "" : 'target="_blank"';

      card.innerHTML = `
        ${imageHtml}
        <div class="project-content">
          <span class="card-tag">${project.category}</span>
          <h3 class="card-title">${project.title}</h3>
          <p class="card-desc">${project.description}</p>
          <div class="card-meta" style="margin-top: auto;">
            <a href="${project.link || '#'}" ${targetAttr} class="card-link view-detail-trigger" data-type="project" data-id="${project.id}">
              ${viewLabel}
              <svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
            </a>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // 7. Setup Tabs Click Filtering
  function setupFilters(containerId, renderCallback) {
    const filterContainer = document.getElementById(containerId);
    if (!filterContainer) return;

    filterContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-tab")) {
        filterContainer.querySelectorAll(".filter-tab").forEach(tab => {
          tab.classList.remove("active");
        });
        e.target.classList.add("active");
        const filterValue = e.target.getAttribute("data-filter");
        renderCallback(filterValue);
      }
    });
  }

  // 8. Typing Animation for Hero Focus Areas
  function initTypingAnimation() {
    const phrases = [
      "OOP & Java development",
      "Flutter Mobile Development",
      "Big Data Analytics",
      "Computer Networking"
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const hook = document.getElementById("typing-hook");

    if (!hook) return;

    function type() {
      const currentPhrase = phrases[phraseIndex];
      
      if (isDeleting) {
        hook.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
      } else {
        hook.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
      }

      let speed = 80;
      if (isDeleting) speed = 40;

      if (!isDeleting && charIndex === currentPhrase.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 500;
      }

      setTimeout(type, speed);
    }

    type();
  }

  // 9. Scroll Reveal Observer
  function initScrollReveal() {
    const revealElements = document.querySelectorAll(".reveal");
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => observer.observe(el));
  }

  // 10. Fallback Hardcoded Data
  function loadHardcodedFallback() {
    portfolioData = {
      profile: {
        name: "Assep Wahid",
        bio: "Saya adalah mahasiswa Teknologi Informasi Universitas Tidar. Memiliki fokus keahlian di bidang pemrograman PBO/OOP Java, Mobile Development Flutter, Big Data Analytics, serta Jaringan Cisco.",
        university: "Universitas Tidar",
        avatar: "Assep.jpg",
        github: "https://github.com/assepwahid5",
        linkedin: "https://id.linkedin.com/in/assep-wahid",
        medium: "https://medium.com/@assepwahid",
        email: "assepwahid.dev@gmail.com"
      },
      articles: [],
      projects: []
    };
    initPortfolio(portfolioData);
  }
});
