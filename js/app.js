"use strict";

/* Vanilla JavaScript enhancements for the eight static pages.
   This is a local coursework prototype; no requests or messages leave the browser. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const body = document.body;
  const prefix = body.dataset.storage;
  const isHub = body.dataset.version === "2";
  const page =
    $(".app")?.dataset.page ||
    $("[data-auth-form]")?.dataset.authForm ||
    "onboarding";
  const query = new URLSearchParams(location.search);
  const defaults = {
    name: body.dataset.own,
    email: body.dataset.email,
    position: isHub ? "Веб разработчик" : "Дизайнер продукта",
    status: "online",
  };
  const statusLabels = {
    online: "В сети",
    dnd: "Не беспокоить",
    invisible: "Невидимый",
    away: "Отошёл",
  };
  const contacts = [
    body.dataset.colleague,
    body.dataset.second,
    isHub ? "Михайлов Сергей" : "Денис Волков",
    isHub ? "Михайлова Татьяна" : "Ольга Никитина",
  ];
  const channel = query.get("channel") || body.dataset.defaultChannel;
  const personIndex = Math.max(
    0,
    Math.min(3, Math.trunc(Number(query.get("person")) || 0)),
  );
  const conversationKey =
    page === "dm" ? `dm-${personIndex}` : `channel-${channel}`;
  let memory = {};

  // Storage is optional: private browsing or a full quota must not break navigation.
  function read(key, fallback = null) {
    try {
      const value = localStorage.getItem(`${prefix}:${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return memory[key] ?? fallback;
    }
  }
  function save(key, value) {
    memory[key] = value;
    try {
      localStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
      return true;
    } catch {
      toast(
        "Изменения доступны в текущем сеансе. Хранилище браузера недоступно или заполнено.",
      );
      return false;
    }
  }
  function escape(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  let profile = { ...defaults, ...read("profile", {}) };
  let toastTimer;
  function toast(text) {
    const target = $(".toast");
    if (!target) return;
    target.textContent = text;
    target.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (target.hidden = true), 4500);
  }
  function info(text) {
    $("[data-info-text]").textContent = text;
    $("#info-dialog").showModal();
  }
  function showError(form, selector, text, fields = []) {
    const target = $(selector, form);
    target.textContent = text;
    target.hidden = false;
    fields.forEach((input) => input.setAttribute("aria-invalid", "true"));
    fields[0]?.focus({ preventScroll: true });
  }
  function clearErrors(form) {
    $$("[aria-invalid]", form).forEach((input) =>
      input.removeAttribute("aria-invalid"),
    );
    $$(".form-error", form).forEach((error) => (error.hidden = true));
  }
  function applyProfile() {
    $$("[data-own-name]").forEach((node) => (node.textContent = profile.name));
    $$("[data-own-avatar]").forEach((node) => {
      node.replaceChildren();
      if (profile.avatar) {
        const img = document.createElement("img");
        img.src = profile.avatar;
        img.alt = "";
        node.append(img);
      } else node.append(document.createTextNode(initials(profile.name)));
      const status = document.createElement("i");
      status.className = `status status-${profile.status}`;
      status.setAttribute("role", "img");
      status.setAttribute("aria-label", statusLabels[profile.status]);
      node.append(status);
    });
    $$("[data-own-status]").forEach(
      (node) => (node.textContent = statusLabels[profile.status]),
    );
    $$("[data-workspace]").forEach(
      (node) =>
        (node.textContent = read("workspace", body.dataset.defaultWorkspace)),
    );
  }
  applyProfile();

  // Themes update color tokens on <html> and stay independent between the two projects.
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(`${prefix}:theme`, theme);
    } catch {
      /* The current document still updates. */
    }
    $$("[data-theme-choice]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.themeChoice === theme)),
    );
    $$("[data-theme-toggle]").forEach((b) =>
      b.setAttribute("aria-pressed", String(theme === "dark")),
    );
  }
  setTheme(document.documentElement.dataset.theme || "light");
  $$("[data-theme-toggle]").forEach((b) =>
    b.addEventListener("click", () =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "light" : "dark",
      ),
    ),
  );
  $$("[data-theme-choice]").forEach((b) =>
    b.addEventListener("click", () => setTheme(b.dataset.themeChoice)),
  );

  // A single fixed tooltip never changes the size of any scroll container.
  const tooltip = document.createElement("div");
  tooltip.className = "ui-tooltip";
  tooltip.id = "ui-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);
  let tooltipOwner = null;
  function hideTooltip() {
    tooltipOwner?.removeAttribute("aria-describedby");
    tooltipOwner = null;
    tooltip.hidden = true;
  }
  function showTooltip(owner) {
    if (!owner || !owner.getClientRects().length) return;
    hideTooltip();
    tooltipOwner = owner;
    tooltip.textContent = owner.dataset.tooltip;
    tooltip.hidden = false;
    const rect = owner.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 8))}px`;
    const top =
      rect.top >= height + 12 ? rect.top - height - 8 : rect.bottom + 8;
    tooltip.style.top = `${Math.max(8, Math.min(top, innerHeight - height - 8))}px`;
    owner.setAttribute("aria-describedby", tooltip.id);
  }
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse") return;
    const owner = event.target.closest("[data-tooltip]");
    if (owner !== tooltipOwner) owner ? showTooltip(owner) : hideTooltip();
  });
  document.addEventListener("pointerout", (event) => {
    if (tooltipOwner && !tooltipOwner.contains(event.relatedTarget))
      hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const owner = event.target.closest("[data-tooltip]");
    if (owner?.matches(":focus-visible")) showTooltip(owner);
  });
  document.addEventListener("focusout", hideTooltip);
  document.addEventListener("pointerdown", hideTooltip);
  document.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);

  let lastMenuFocus;
  function syncSidebar() {
    const sidebar = $("#sidebar");
    if (!sidebar) return;
    const closed =
      !matchMedia("(min-width: 1280px)").matches &&
      !$(".app").classList.contains("menu-open");
    sidebar.inert = closed;
    sidebar.setAttribute("aria-hidden", String(closed));
  }
  syncSidebar();
  function closeMenu() {
    const app = $(".app");
    if (!app?.classList.contains("menu-open")) return;
    app.classList.remove("menu-open");
    syncSidebar();
    $("[data-menu-open]")?.setAttribute("aria-expanded", "false");
    if (lastMenuFocus?.getClientRects().length)
      lastMenuFocus.focus({ preventScroll: true });
  }
  $("[data-menu-open]")?.addEventListener("click", (event) => {
    lastMenuFocus = event.currentTarget;
    $(".app").classList.add("menu-open");
    syncSidebar();
    lastMenuFocus.setAttribute("aria-expanded", "true");
    $("[data-menu-close]", $("#sidebar"))?.focus({ preventScroll: true });
  });
  $$("[data-menu-close]").forEach((b) =>
    b.addEventListener("click", closeMenu),
  );
  const desktop = matchMedia("(min-width: 1280px)");
  desktop.addEventListener("change", () => {
    if (desktop.matches) closeMenu();
    syncSidebar();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      location.href = "search.html";
    }
    if (event.key === "Escape") {
      closeMenu();
      closeContext();
      $$(".mention-list").forEach((list) => (list.hidden = true));
      if (!$("dialog[open]") && !$("#thread")?.hidden) closeThread();
    }
    // Keep the focus inside the tablet/mobile navigation drawer.
    if (event.key === "Tab" && $(".app.menu-open")) {
      const items = $$("a, button", $("#sidebar")).filter(
        (n) => n.getClientRects().length,
      );
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus({ preventScroll: true });
      }
    }
  });

  $$("[data-password]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Скрыть пароль" : "Показать пароль",
      );
      button.dataset.tooltip = button.getAttribute("aria-label");
    }),
  );
  $$("[data-dialog-close]").forEach((b) =>
    b.addEventListener("click", () => b.closest("dialog").close()),
  );
  $$("dialog").forEach((d) =>
    d.addEventListener("click", (e) => {
      if (
        e.target === d &&
        (e.clientX < d.getBoundingClientRect().left ||
          e.clientX > d.getBoundingClientRect().right ||
          e.clientY < d.getBoundingClientRect().top ||
          e.clientY > d.getBoundingClientRect().bottom)
      )
        d.close();
    }),
  );
  $("[data-forgot]")?.addEventListener("click", () =>
    $("#recovery-dialog").showModal(),
  );
  $("[data-recovery-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    $(".recovery-result", event.currentTarget).hidden = false;
  });
  $("[data-google]")?.addEventListener("click", () =>
    info(
      "Это учебная вёрстка. Вход через Google требует серверной интеграции. Для просмотра войдите с демонстрационными данными или зарегистрируйте локальный аккаунт.",
    ),
  );

  async function digest(value) {
    if (!globalThis.crypto?.subtle)
      throw new Error("Для сохранения пароля откройте проект через localhost.");
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return [...new Uint8Array(bytes)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  function strength(value) {
    if (!value) return 0;
    let score = value.length >= 8 ? 1 : 0;
    if (/[A-ZА-Я]/.test(value) && /[a-zа-я]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^\p{L}\p{N}]/u.test(value)) score++;
    return Math.max(1, Math.min(4, score));
  }
  $("#auth-password")?.addEventListener("input", (event) => {
    if (!$("[data-strength]")) return;
    const score = strength(event.target.value);
    $("[data-strength]").dataset.score = String(score);
    $("[data-strength]").setAttribute(
      "aria-label",
      `Сложность пароля ${score} из 4`,
    );
    $("[data-strength-label]").textContent = [
      "Минимум 8 символов",
      "Слабый пароль",
      "Средний пароль",
      "Хороший пароль",
      "Надёжный пароль",
    ][score];
  });
  $("[data-auth-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearErrors(form);
    const email = $("#auth-email");
    const password = $("#auth-password");
    const registering = form.dataset.authForm === "register";
    const name = $("#auth-name");
    const confirm = $("#auth-confirm");
    if (!email.validity.valid || !email.value.trim())
      return showError(form, "[data-auth-error]", "Введите корректный email.", [
        email,
      ]);
    if (!password.value || (registering && password.value.length < 8))
      return showError(
        form,
        "[data-auth-error]",
        "Пароль должен содержать не менее 8 символов.",
        [password],
      );
    if (registering && !name.value.trim())
      return showError(form, "[data-auth-error]", "Введите ваше имя.", [name]);
    if (registering && password.value !== confirm.value)
      return showError(form, "[data-auth-error]", "Пароли не совпадают.", [
        confirm,
      ]);
    const account = read("account");
    try {
      if (registering) {
        if (account?.email.toLowerCase() === email.value.trim().toLowerCase())
          return showError(
            form,
            "[data-auth-error]",
            "Аккаунт с таким email уже существует. Войдите в него.",
            [email],
          );
        save("account", {
          email: email.value.trim(),
          passwordHash: await digest(password.value),
        });
        profile = {
          ...profile,
          name: name.value.trim(),
          email: email.value.trim(),
        };
        save("profile", profile);
        location.href = "onboarding.html";
      } else {
        const demo =
          (!account ||
            account.email.toLowerCase() !== defaults.email.toLowerCase()) &&
          email.value.trim().toLowerCase() === defaults.email.toLowerCase() &&
          password.value === "Connectify123!";
        const local =
          account &&
          email.value.trim().toLowerCase() === account.email.toLowerCase() &&
          (await digest(password.value)) === account.passwordHash;
        if (!demo && !local)
          return showError(
            form,
            "[data-auth-error]",
            "Неверный email или пароль",
            [email, password],
          );
        save("signedIn", true);
        location.href = "channel.html";
      }
    } catch (error) {
      showError(form, "[data-auth-error]", error.message);
    }
  });

  // Profile, avatar and notification preferences.
  const profileForm = $("[data-profile-form]");
  function populateProfile() {
    if (!profileForm) return;
    ["name", "email", "position"].forEach(
      (key) => (profileForm.elements[key].value = profile[key]),
    );
    profileForm.elements.status.value = profile.status;
  }
  populateProfile();
  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    profile = {
      ...profile,
      name: profileForm.elements.name.value.trim(),
      email: profileForm.elements.email.value.trim(),
      position: profileForm.elements.position.value.trim(),
      status: profileForm.elements.status.value,
    };
    if (!profile.name) return toast("Укажите имя.");
    save("profile", profile);
    applyProfile();
    toast("Профиль сохранён");
  });
  profileForm?.addEventListener("reset", () => {
    setTimeout(() => {
      profile = { ...defaults, ...read("profile", {}) };
      populateProfile();
      applyProfile();
      toast("Изменения отменены");
    });
  });
  $("#avatar-file")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      event.target.value = "";
      return toast("Выберите PNG, JPG или WebP размером до 5 МБ.");
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const context = canvas.getContext("2d");
        const size = Math.min(image.width, image.height);
        context.drawImage(
          image,
          (image.width - size) / 2,
          (image.height - size) / 2,
          size,
          size,
          0,
          0,
          160,
          160,
        );
        profile.avatar = canvas.toDataURL("image/webp", 0.85);
        applyProfile();
        toast("Аватар выбран. Сохраните изменения.");
      };
      image.onerror = () => toast("Не удалось прочитать изображение.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const preferences = read("preferences", {});
  $$("[data-preference]").forEach((input) => {
    input.checked = preferences[input.dataset.preference] ?? true;
    input.addEventListener("change", () => {
      preferences[input.dataset.preference] = input.checked;
      save("preferences", preferences);
      toast("Настройка сохранена");
    });
  });
  function setSettingsTab(name, updateHash = true) {
    if (!$(`[data-settings-panel="${name}"]`)) name = "profile";
    $$("[data-settings-tab]").forEach((tab) =>
      tab.setAttribute(
        "aria-selected",
        String(tab.dataset.settingsTab === name),
      ),
    );
    $$("[data-settings-panel]").forEach(
      (panel) => (panel.hidden = panel.dataset.settingsPanel !== name),
    );
    if (updateHash) history.replaceState(null, "", `#${name}`);
  }
  $$("[data-settings-tab]").forEach((tab) =>
    tab.addEventListener("click", () =>
      setSettingsTab(tab.dataset.settingsTab),
    ),
  );
  if ($("[data-settings-tab]"))
    setSettingsTab(location.hash.slice(1) || "profile", false);
  $("[data-security-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearErrors(form);
    const current = $("#current-password");
    const next = $("#new-password");
    const confirm = $("#confirm-new");
    try {
      const account = read("account");
      const valid = account
        ? (await digest(current.value)) === account.passwordHash
        : current.value === "Connectify123!";
      if (!valid)
        return showError(
          form,
          "[data-security-error]",
          "Текущий пароль указан неверно.",
          [current],
        );
      if (next.value !== confirm.value)
        return showError(
          form,
          "[data-security-error]",
          "Пароли не совпадают.",
          [confirm],
        );
      save("account", {
        email: profile.email,
        passwordHash: await digest(next.value),
      });
      form.reset();
      toast("Локальный пароль обновлён");
    } catch (error) {
      showError(form, "[data-security-error]", error.message);
    }
  });
  $$("[data-logout]").forEach((link) =>
    link.addEventListener("click", () => save("signedIn", false)),
  );

  // Render only a small, safe Markdown subset. HTML entered by a user stays text.
  function markdown(value) {
    return escape(value)
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/~~([^~\n]+)~~/g, "<s>$1</s>")
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(
        /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      .replace(/\n/g, "<br>");
  }
  const messagesRoot = $("[data-messages]");
  let customMessages = read(`messages-${conversationKey}`, []);
  let currentThread = "";
  let threadFocus;
  let editingMessage = null;
  function persistMessages() {
    save(`messages-${conversationKey}`, customMessages);
  }
  function appendMessage(record, target, thread = false) {
    const article = document.createElement("article");
    article.className = "message";
    article.dataset.message = "";
    article.dataset.customId = record.id;
    article.dataset.ownMessage = "true";
    const time = new Date(record.created).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const previous = target.lastElementChild;
    const grouped =
      previous?.matches("[data-own-message=true]") &&
      record.created - Number(previous.dataset.created || 0) < 300000;
    if (grouped) article.classList.add("grouped");
    article.dataset.created = record.created;
    const avatar = `<span class="avatar" data-own-avatar>${escape(initials(profile.name))}</span>`;
    const actions = $(".message-actions")?.innerHTML || "";
    article.innerHTML = `${avatar}<div class="message-content">${grouped ? "" : `<div class="message-meta"><strong data-own-name>${escape(profile.name)}</strong><time>${time}</time></div>`}<div class="message-text">${markdown(record.text)}</div></div><div class="message-actions">${actions}</div>`;
    if (record.attachment) {
      const link = document.createElement("a");
      link.className = "file-card";
      link.textContent = record.attachment.name;
      link.download = record.attachment.name;
      link.href = record.attachment.data;
      $(".message-content", article).append(link);
    }
    if (thread) article.dataset.threadReply = "true";
    target.append(article);
    return article;
  }
  if (messagesRoot) {
    $$("[data-message]", messagesRoot).forEach((article, i) => {
      article.dataset.seedId = String(i);
      if ($("[data-own-name]", article)) article.dataset.ownMessage = "true";
    });
    if (page === "channel" && channel !== body.dataset.defaultChannel) {
      messagesRoot.innerHTML =
        '<div class="date-divider">Сегодня</div><div class="empty-state" data-channel-welcome><h2></h2><p class="muted">Это начало канала. Напишите первое сообщение.</p></div>';
      $("[data-channel-welcome] h2").textContent = `Канал #${channel}`;
    }
    if (page === "dm" && personIndex !== 0) {
      messagesRoot.innerHTML =
        '<div class="date-divider">Сегодня</div><div class="empty-state" data-channel-welcome><h2>Начните разговор</h2><p class="muted"></p></div>';
      $("[data-channel-welcome] p").textContent =
        `Личная переписка с ${contacts[personIndex]}`;
    }
    customMessages.forEach((record) => appendMessage(record, messagesRoot));
    if (page === "channel") {
      $("[data-page-title]").textContent = channel;
      $$("[data-channel]").forEach((a) =>
        a.classList.toggle("active", a.dataset.channel === channel),
      );
    } else if (page === "dm") {
      $("[data-page-title]").textContent = contacts[personIndex];
      document.title = `${contacts[personIndex]} | Connectify`;
      $$('#sidebar .side-link[href^="dm.html?person="]').forEach((link) => {
        const selected =
          Number(new URL(link.href).searchParams.get("person")) === personIndex;
        link.classList.toggle("active", selected);
        if (selected) {
          link.setAttribute("aria-current", "page");
          const avatar = $(".avatar", link).cloneNode(true);
          avatar.classList.replace("avatar-28", "avatar-36");
          $(".header-tile").replaceChildren(avatar);
          const status =
            $(".status", avatar)?.getAttribute("aria-label") || "online";
          $("[data-page-subtitle]").textContent =
            statusLabels[status] || "Не в сети";
        } else link.removeAttribute("aria-current");
      });
    }
    const input = $("[data-composer=main] textarea");
    input.placeholder =
      page === "dm"
        ? `Сообщение ${contacts[personIndex]}…`
        : `Написать в #${channel}…`;
  }
  let threadRecords = [];
  function openThread(button) {
    const panel = $("#thread");
    if (!panel) return;
    threadFocus = button;
    const message = button.closest("[data-message]");
    currentThread =
      message?.dataset.customId || `seed-${message?.dataset.seedId || 0}`;
    threadRecords = read(`thread-${conversationKey}-${currentThread}`, []);
    const root = $("[data-thread-messages]");
    $$("[data-custom-id]", root).forEach((n) => n.remove());
    let quote = $("[data-thread-parent]", root);
    if (!quote) {
      quote = document.createElement("blockquote");
      quote.dataset.threadParent = "";
      root.prepend(quote);
    }
    quote.textContent =
      $(".message-text", message || messagesRoot)?.textContent ||
      "Обсуждение сообщения";
    threadRecords.forEach((record) => appendMessage(record, root, true));
    panel.hidden = false;
    $("[data-composer=thread] textarea").focus({ preventScroll: true });
  }
  function closeThread() {
    if ($("#thread")) $("#thread").hidden = true;
    threadFocus?.focus({ preventScroll: true });
  }
  $("[data-thread-close]")?.addEventListener("click", closeThread);

  const reactionStates = read(`reactions-${conversationKey}`, {});
  $$(".pill[data-reaction]").forEach((pill, i) => {
    pill.dataset.reactionId = String(i);
    if (reactionStates[i]) {
      pill.setAttribute("aria-pressed", String(reactionStates[i].active));
      $("span", pill).textContent = reactionStates[i].count;
    }
  });
  function react(pill) {
    const active = pill.getAttribute("aria-pressed") === "true";
    const count = Math.max(
      0,
      Number($("span", pill).textContent) + (active ? -1 : 1),
    );
    pill.setAttribute("aria-pressed", String(!active));
    $("span", pill).textContent = count;
    pill.setAttribute(
      "aria-label",
      `${pill.dataset.reaction === "heart" ? "Нравится" : "Готово"}, ${count} реакций`,
    );
    if (pill.dataset.reactionId) {
      reactionStates[pill.dataset.reactionId] = { active: !active, count };
      save(`reactions-${conversationKey}`, reactionStates);
    }
  }
  const contextMenu = $("[data-context-menu]");
  let contextMessage = null;
  function closeContext() {
    if (contextMenu) contextMenu.hidden = true;
  }
  function showContext(button) {
    contextMessage = button.closest("[data-message]");
    contextMenu.hidden = false;
    $$(
      "[data-context-action=edit], [data-context-action=delete]",
      contextMenu,
    ).forEach((b) => (b.hidden = contextMessage.dataset.ownMessage !== "true"));
    const rect = button.getBoundingClientRect();
    contextMenu.style.left = `${Math.max(8, Math.min(rect.right - 220, innerWidth - 228))}px`;
    contextMenu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, innerHeight - contextMenu.offsetHeight - 12))}px`;
    $("button", contextMenu).focus({ preventScroll: true });
  }
  document.addEventListener("click", (event) => {
    const reaction = event.target.closest("[data-reaction]");
    if (reaction) react(reaction);
    const threadButton = event.target.closest("[data-thread-open]");
    if (threadButton) openThread(threadButton);
    const quick = event.target.closest("[data-quick-reaction]");
    if (quick) {
      const container = $(".message-content", quick.closest("[data-message]"));
      let pill = $("[data-reaction]", container);
      if (!pill) {
        const holder = document.createElement("div");
        holder.className = "reactions";
        holder.innerHTML =
          '<button type="button" class="pill" aria-pressed="false" aria-label="Нравится, 0 реакций" data-reaction="heart">♥ <span>0</span></button>';
        container.append(holder);
        pill = $("button", holder);
      }
      react(pill);
    }
    const menuButton = event.target.closest("[data-message-menu]");
    if (menuButton) showContext(menuButton);
    else if (!event.target.closest("[data-context-menu]")) closeContext();
    const action = event.target.closest("[data-context-action]");
    if (action && contextMessage) {
      const text = $(".message-text", contextMessage).textContent;
      if (action.dataset.contextAction === "copy") {
        if (navigator.clipboard?.writeText)
          navigator.clipboard
            .writeText(text)
            .then(() => toast("Текст скопирован"))
            .catch(() => info(text));
        else info(text);
      }
      if (action.dataset.contextAction === "edit") {
        editingMessage = contextMessage;
        const form = contextMessage.dataset.threadReply
          ? $("[data-composer=thread]")
          : $("[data-composer=main]");
        const record = (
          contextMessage.dataset.threadReply ? threadRecords : customMessages
        ).find((m) => m.id === contextMessage.dataset.customId);
        $("textarea", form).value = record?.text || text;
        $("textarea", form).focus({ preventScroll: true });
        toast("Измените текст и отправьте сообщение");
      }
      if (action.dataset.contextAction === "delete") {
        const id = contextMessage.dataset.customId;
        if (contextMessage.dataset.threadReply) {
          threadRecords = threadRecords.filter((m) => m.id !== id);
          save(`thread-${conversationKey}-${currentThread}`, threadRecords);
        } else {
          customMessages = customMessages.filter((m) => m.id !== id);
          persistMessages();
        }
        contextMessage.remove();
        toast("Сообщение удалено");
      }
      closeContext();
    }
  });

  // Each composer owns its draft, attachment and mention list.
  $$("[data-composer]").forEach((form) => {
    const input = $("textarea", form);
    const list = $(".mention-list", form);
    const isThread = form.dataset.composer === "thread";
    let attachment = null;
    let mentionIndex = 0;
    function updateMentions() {
      const before = input.value.slice(0, input.selectionStart);
      const match = before.match(/(?:^|\s)@([^\s@]*)$/u);
      if (!match) {
        list.hidden = true;
        return;
      }
      const matches = [...contacts, profile.name].filter((n) =>
        n.toLowerCase().includes(match[1].toLowerCase()),
      );
      list.innerHTML = matches
        .map(
          (n, i) =>
            `<button type="button" class="mention-option" role="option" aria-selected="${i === 0}" data-mention-name="${escape(n)}"><span class="avatar avatar-28">${escape(initials(n))}</span><span><strong>${escape(n)}</strong><small>Участник команды</small></span></button>`,
        )
        .join("");
      mentionIndex = 0;
      list.hidden = !matches.length;
    }
    function insertMention(name) {
      const before = input.value.slice(0, input.selectionStart);
      const after = input.value.slice(input.selectionEnd);
      const next = before.replace(/@[^\s@]*$/u, `@${name} `);
      input.value = next + after;
      input.focus({ preventScroll: true });
      input.setSelectionRange(next.length, next.length);
      list.hidden = true;
    }
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mention-name]");
      if (b) insertMention(b.dataset.mentionName);
    });
    input.addEventListener("input", updateMentions);
    input.addEventListener("keydown", (e) => {
      if (!list.hidden && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        e.preventDefault();
        const options = $$(".mention-option", list);
        if (e.key === "Enter")
          return insertMention(options[mentionIndex].dataset.mentionName);
        mentionIndex =
          (mentionIndex + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
          options.length;
        options.forEach((b, i) =>
          b.setAttribute("aria-selected", String(i === mentionIndex)),
        );
        // Scroll only the mention list; scrollIntoView also moves the chat/document.
        const option = options[mentionIndex];
        const top = option.offsetTop;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (top + option.offsetHeight > list.scrollTop + list.clientHeight)
          list.scrollTop = top + option.offsetHeight - list.clientHeight;
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    function insertText(text) {
      input.setRangeText(text, input.selectionStart, input.selectionEnd, "end");
      input.focus({ preventScroll: true });
      updateMentions();
    }
    $("[data-mention]", form).addEventListener("click", () =>
      insertText((input.value && !/\s$/.test(input.value) ? " " : "") + "@"),
    );
    $("[data-emoji]", form).addEventListener("click", () => insertText(" 😊 "));
    $$("[data-format]", form).forEach((button) =>
      button.addEventListener("click", () => {
        const selected =
          input.value.slice(input.selectionStart, input.selectionEnd) ||
          "текст";
        const marks = { bold: "**", italic: "*", strike: "~~", code: "`" };
        const type = button.dataset.format;
        if (type === "link") insertText(`[${selected}](https://example.com)`);
        else insertText(marks[type] + selected + marks[type]);
      }),
    );
    $("[data-attach]", form).addEventListener("click", () =>
      $("[data-attachment]", form).click(),
    );
    $("[data-attachment]", form).addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024)
        return toast("Для локальной демонстрации выберите файл до 2 МБ.");
      const reader = new FileReader();
      reader.onload = () => {
        attachment = { name: file.name, data: reader.result };
        $(".pending-files", form).textContent = `Прикреплён файл: ${file.name}`;
      };
      reader.readAsDataURL(file);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text && !attachment) {
        input.focus({ preventScroll: true });
        return;
      }
      const target = isThread ? $("[data-thread-messages]") : messagesRoot;
      if (editingMessage) {
        const records = isThread ? threadRecords : customMessages;
        const record = records.find(
          (m) => m.id === editingMessage.dataset.customId,
        );
        if (record) record.text = text;
        $(".message-text", editingMessage).innerHTML = markdown(text);
        editingMessage = null;
      } else {
        const record = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created: Date.now(),
          text,
          attachment,
        };
        (isThread ? threadRecords : customMessages).push(record);
        $("[data-channel-welcome]", target)?.remove();
        appendMessage(record, target, isThread);
      }
      if (isThread)
        save(`thread-${conversationKey}-${currentThread}`, threadRecords);
      else persistMessages();
      input.value = "";
      attachment = null;
      $(".pending-files", form).textContent = "";
      list.hidden = true;
      target.scrollTop = target.scrollHeight;
      input.focus({ preventScroll: true });
    });
  });
  if (query.get("thread") === "open") $("[data-thread-open]")?.click();

  // Search index mirrors the example conversations and includes locally sent messages.
  if ($("[data-search-form]")) {
    const own = profile.name;
    const first = body.dataset.colleague;
    const second = body.dataset.second;
    const searchChannel = body.dataset.defaultChannel;
    const seedText = isHub
      ? [
          "Ребята, закончил форму регистрации. Добавил проверку Email и пароля.",
          "Нашла небольшую ошибку: не проверяется повторная регистрация с одним Email.",
          "Исправил! Добавил уведомление об успешной регистрации.",
        ]
      : [
          "Доброе утро! Обсудим новый поиск в воркспейсе. Что важно проверить перед релизом?",
          "Фильтры поиска уже в /search. Старую вкладку убрал, остались сообщения и файлы.",
          "Добавил пример с подсветкой совпадений. Посмотрите поиск в макете перед созвоном.",
        ];
    const seeds = seedText.map((text, i) => ({
      type: "messages",
      name: [first, second, own][i],
      text,
      detail: `# ${searchChannel}`,
      href: `channel.html?channel=${searchChannel}`,
      order: i,
      time: ["09:30", "09:46", "10:12"][i],
    }));
    const channelNames = [
      ...new Set([
        ...(isHub
          ? ["дизайн", "разработка", "проекты", "маркетинг"]
          : ["общее", "дизайн", "разработка", "релизы"]),
        ...read("channels", []),
      ]),
    ];
    const index = [
      ...seeds,
      {
        type: "files",
        name: isHub ? "register.php" : "Макет поиска",
        text: isHub
          ? "Регистрация и проверка email"
          : "Поиск по сообщениям и файлам",
        detail: isHub ? "PHP, 8,4 КБ" : "Figma, обновлено сегодня",
        href: isHub ? "img/register-example.txt" : "channel.html",
        order: 4,
      },
      ...[...contacts, own].map((name, i) => ({
        type: "people",
        name,
        text: name,
        detail: "Участник команды",
        href: i === 4 ? "profile-edit.html" : `dm.html?person=${i}`,
        order: i,
      })),
      ...channelNames.map((name, i) => ({
        type: "channels",
        name: `# ${name}`,
        text: name,
        detail: "Тематический канал",
        href: `channel.html?channel=${name}`,
        order: i,
      })),
    ];
    channelNames.forEach((name) =>
      read(`messages-channel-${name}`, []).forEach((record, i) =>
        index.push({
          type: "messages",
          name: own,
          text: record.text,
          detail: `# ${name}`,
          href: `channel.html?channel=${name}`,
          order: 10 + i,
        }),
      ),
    );
    contacts.forEach((name, person) =>
      read(`messages-dm-${person}`, []).forEach((record, i) =>
        index.push({
          type: "messages",
          name: own,
          text: record.text,
          detail: `Личная переписка с ${name}`,
          href: `dm.html?person=${person}`,
          order: 100 + i,
        }),
      ),
    );
    let active = ["messages", "files", "people", "channels"].includes(
      query.get("tab"),
    )
      ? query.get("tab")
      : "messages";
    const searchInput = $("#query");
    if (query.has("q")) searchInput.value = query.get("q");
    function highlight(text, term) {
      if (!term) return escape(text);
      const needle = term.toLocaleLowerCase("ru");
      const source = String(text);
      let pos = 0;
      let out = "";
      let found;
      while (
        (found = source.toLocaleLowerCase("ru").indexOf(needle, pos)) !== -1
      ) {
        out +=
          escape(source.slice(pos, found)) +
          "<mark>" +
          escape(source.slice(found, found + term.length)) +
          "</mark>";
        pos = found + term.length;
      }
      return out + escape(source.slice(pos));
    }
    function renderSearch() {
      const term = searchInput.value.trim();
      const matching = index.filter(
        (item) =>
          !term ||
          `${item.name} ${item.text} ${item.detail}`
            .toLowerCase()
            .includes(term.toLowerCase()),
      );
      const results = matching
        .filter((item) => item.type === active)
        .sort((a, b) =>
          $("[data-search-sort]").value === "old"
            ? a.order - b.order
            : b.order - a.order,
        );
      $$("[data-search-tab]").forEach((tab) =>
        tab.setAttribute(
          "aria-selected",
          String(tab.dataset.searchTab === active),
        ),
      );
      $$("[data-result-count]").forEach(
        (b) =>
          (b.textContent = matching.filter(
            (item) => item.type === b.dataset.resultCount,
          ).length),
      );
      $("[data-search-summary]").textContent = `Результатов: ${results.length}`;
      $("#search-results").innerHTML = results
        .map(
          (item) =>
            `<a class="search-result" href="${escape(item.href)}"><span class="result-meta"><span class="avatar avatar-36">${escape(initials(item.name.replace("# ", "")))}</span><span><strong>${highlight(item.name, term)}</strong><small>${highlight(item.detail, term)}</small></span><time>${item.time || "Сегодня"}</time></span><p class="result-text">${highlight(item.text, term)}</p></a>`,
        )
        .join("");
      $("[data-search-empty]").hidden = results.length !== 0;
    }
    $("[data-search-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      renderSearch();
    });
    searchInput.addEventListener("input", renderSearch);
    $$("[data-search-tab]").forEach((tab) =>
      tab.addEventListener("click", () => {
        active = tab.dataset.searchTab;
        renderSearch();
      }),
    );
    $$("[data-search-clear]").forEach((button) =>
      button.addEventListener("click", () => {
        searchInput.value = "";
        renderSearch();
        searchInput.focus({ preventScroll: true });
      }),
    );
    $("[data-search-sort]").addEventListener("change", renderSearch);
    renderSearch();
  }

  const readIds = read("readActivities", []);
  let notificationFilter = "all";
  function updateActivities() {
    $$("[data-activity]").forEach((activity) => {
      if (readIds.includes(activity.dataset.activity))
        activity.classList.remove("unread");
      activity.hidden =
        notificationFilter === "unread" &&
        !activity.classList.contains("unread");
    });
    const unread =
      3 - ["0", "1", "2"].filter((id) => readIds.includes(id)).length;
    $$("[data-unread-count]").forEach((node) => {
      node.textContent = unread;
      node.hidden = unread === 0;
    });
    if ($("[data-activity-empty]"))
      $("[data-activity-empty]").hidden = $$("[data-activity]").some(
        (a) => !a.hidden,
      );
  }
  updateActivities();
  $$("[data-activity]").forEach((activity) =>
    activity.addEventListener("click", () => {
      if (!readIds.includes(activity.dataset.activity))
        readIds.push(activity.dataset.activity);
      save("readActivities", readIds);
    }),
  );
  $("[data-read-all]")?.addEventListener("click", () => {
    ["0", "1", "2", "3"].forEach((id) => {
      if (!readIds.includes(id)) readIds.push(id);
    });
    save("readActivities", readIds);
    updateActivities();
    toast("Все уведомления прочитаны");
  });
  $$("[data-notification-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      notificationFilter = tab.dataset.notificationTab;
      $$("[data-notification-tab]").forEach((t) =>
        t.setAttribute("aria-selected", String(t === tab)),
      );
      updateActivities();
    }),
  );

  // A small three-step onboarding flow works without an external API.
  const onboarding = $("[data-onboarding]");
  let step = 1;
  let workspaceMode = "create";
  function renderStep() {
    $$("[data-step]").forEach(
      (panel) => (panel.hidden = Number(panel.dataset.step) !== step),
    );
    $$(".stepper li").forEach((item, i) => {
      item.classList.toggle("active", i + 1 === step);
      item.classList.toggle("done", i + 1 < step);
      if (i + 1 === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    $("[data-step-back]").hidden = step === 1;
    $("[data-onboarding-login]").hidden = step !== 1;
    $("[data-step-next]").textContent =
      step === 3 ? "Открыть Connectify" : "Продолжить";
    // Hidden required fields must not block later steps.
    $$("[data-step] input").forEach(
      (input) =>
        (input.disabled =
          input.closest("[data-step]").hidden ||
          (workspaceMode === "create" && input.id === "invite-code") ||
          (workspaceMode === "join" && input.id === "workspace-name")),
    );
    $("[data-onboarding-error]").hidden = true;
  }
  if (onboarding) {
    $("#onboarding-name").value = profile.name;
    $$("[data-workspace-choice]").forEach((button) =>
      button.addEventListener("click", () => {
        workspaceMode = button.dataset.workspaceChoice;
        $$("[data-workspace-choice]").forEach((b) =>
          b.setAttribute("aria-pressed", String(b === button)),
        );
        $("[data-workspace-create]").hidden = workspaceMode !== "create";
        $("[data-workspace-join]").hidden = workspaceMode !== "join";
        renderStep();
      }),
    );
    $("[data-step-back]").addEventListener("click", () => {
      step = Math.max(1, step - 1);
      renderStep();
    });
    onboarding.addEventListener("submit", (event) => {
      event.preventDefault();
      if (step === 1) {
        if (
          workspaceMode === "join" &&
          $("#invite-code").value.trim().toUpperCase() !== "CONNECT2026"
        )
          return showError(
            onboarding,
            "[data-onboarding-error]",
            "Приглашение не найдено. Попробуйте код CONNECT2026.",
            [$("#invite-code")],
          );
        save(
          "workspace",
          workspaceMode === "join"
            ? body.dataset.defaultWorkspace
            : $("#workspace-name").value.trim(),
        );
      }
      if (step === 2) {
        profile.name = $("#onboarding-name").value.trim();
        profile.position = $("#onboarding-role").value.trim();
        save("profile", profile);
        applyProfile();
      }
      if (step === 3) {
        save("signedIn", true);
        location.href = "channel.html";
        return;
      }
      step++;
      renderStep();
    });
    renderStep();
  }
  $("[data-add-channel]")?.addEventListener("click", () =>
    $("#channel-dialog").showModal(),
  );
  $("[data-channel-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#channel-name").value.trim();
    const added = read("channels", []);
    if (!added.includes(name)) added.push(name);
    save("channels", added);
    location.href = `channel.html?channel=${encodeURIComponent(name)}`;
  });
  read("channels", []).forEach((name) => {
    if (
      !$(".side-scroll") ||
      $$("[data-channel]").some((a) => a.dataset.channel === name)
    )
      return;
    const link = document.createElement("a");
    link.className = "side-link";
    link.dataset.channel = name;
    link.textContent = `# ${name}`;
    link.href = `channel.html?channel=${encodeURIComponent(name)}`;
    if (page === "channel" && name === channel) link.classList.add("active");
    const heading = $$(".nav-heading")[1];
    heading?.before(link);
  });
  $("[data-page-actions]")?.addEventListener("click", () =>
    info(
      page === "channel"
        ? `Канал #${channel}. Здесь можно обсуждать задачи, отвечать в тредах и обмениваться файлами. Участников в команде: 8.`
        : `Рабочее пространство ${read("workspace", body.dataset.defaultWorkspace)}. Настройки аккаунта доступны в разделе «Профиль».`,
    ),
  );
})();
