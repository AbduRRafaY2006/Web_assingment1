// Clinic Queue Demonstrator - client-side only (Assignment 1).
// All data is demo data held in memory in this browser tab.

// ---------- State ----------
let avgMinutes = 8;      // average consultation length, editable in the UI
let nextNumber = 107;    // next token number to issue

function minutesAgo(m) {
  return new Date(Date.now() - m * 60000);
}

// Six sample records. Initials only, no real names (privacy-safe demo data).
const tickets = [
  { number: 101, initials: "AK", visit: "General",     status: "done",      priority: false, issuedAt: minutesAgo(55) },
  { number: 102, initials: "MR", visit: "Follow-up",   status: "called",    priority: false, issuedAt: minutesAgo(40) },
  { number: 103, initials: "SH", visit: "Vaccination", status: "waiting",   priority: false, issuedAt: minutesAgo(30) },
  { number: 104, initials: "BT", visit: "General",     status: "waiting",   priority: true,  issuedAt: minutesAgo(20) },
  { number: 105, initials: "ZN", visit: "General",     status: "waiting",   priority: false, issuedAt: minutesAgo(12) },
  { number: 106, initials: "FA", visit: "Follow-up",   status: "cancelled", priority: false, issuedAt: minutesAgo(5) }
];

// Allowed status changes (a simple state machine).
const transitions = {
  waiting: ["called", "cancelled"],
  called: ["done", "cancelled"],
  done: [],
  cancelled: []
};

// ---------- Element references ----------
const roleSelect = document.getElementById("role");
const issueForm = document.getElementById("issue-form");
const issueMessage = document.getElementById("issue-message");
const checkForm = document.getElementById("check-form");
const checkMessage = document.getElementById("check-message");
const nowServing = document.getElementById("now-serving");
const avgInput = document.getElementById("avg-minutes");
const avgMessage = document.getElementById("avg-message");
const callNextButton = document.getElementById("call-next");
const staffMessage = document.getElementById("staff-message");
const filterStatus = document.getElementById("filter-status");
const filterSearch = document.getElementById("filter-search");
const queueBody = document.getElementById("queue-body");
const updatedText = document.getElementById("updated");

// ---------- Helpers ----------
function tokenLabel(ticket) {
  return "A-" + ticket.number;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Waiting tickets in service order: priority first, then earliest issued.
function waitingList() {
  return tickets
    .filter(function (t) { return t.status === "waiting"; })
    .sort(function (a, b) {
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      return a.issuedAt - b.issuedAt;
    });
}

// Estimated wait in minutes: position in line x average minutes.
// Returns null if the ticket is not waiting.
function estimateWait(ticket) {
  const position = waitingList().indexOf(ticket);
  if (position === -1) {
    return null;
  }
  return (position + 1) * avgMinutes;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = "message" + (type ? " " + type : "");
}

// ---------- State changes ----------
function setStatus(ticket, newStatus) {
  if (!transitions[ticket.status].includes(newStatus)) {
    return; // not an allowed change
  }
  ticket.status = newStatus;
  render();
}

function togglePriority(ticket) {
  if (ticket.status !== "waiting") {
    return;
  }
  ticket.priority = !ticket.priority;
  render();
}

// ---------- Rendering ----------
function renderNowServing() {
  const called = tickets.filter(function (t) { return t.status === "called"; });
  if (called.length === 0) {
    nowServing.textContent = "No one has been called yet.";
  } else {
    nowServing.textContent = called.map(tokenLabel).join(", ");
  }
}

function makeCell(row, label, text) {
  const td = document.createElement("td");
  td.dataset.label = label;
  td.textContent = text;
  row.appendChild(td);
  return td;
}

function makeButton(parent, text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (className) {
    button.className = className;
  }
  button.addEventListener("click", onClick);
  parent.appendChild(button);
}

function renderQueue() {
  const statusFilter = filterStatus.value;
  const search = filterSearch.value.trim().toLowerCase();

  const visible = tickets.filter(function (t) {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const text = (tokenLabel(t) + " " + t.initials).toLowerCase();
    return matchesStatus && text.includes(search);
  });

  queueBody.innerHTML = "";

  // Empty state
  if (visible.length === 0) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "empty";
    td.textContent = "No tokens match. Change the filter or get a new token.";
    row.appendChild(td);
    queueBody.appendChild(row);
    return;
  }

  visible.forEach(function (ticket) {
    const row = document.createElement("tr");

    makeCell(row, "Token", tokenLabel(ticket));
    makeCell(row, "Initials", ticket.initials);
    makeCell(row, "Visit", ticket.visit);

    const statusCell = makeCell(row, "Status", ticket.status);
    statusCell.className = "status status-" + ticket.status;
    if (ticket.priority && ticket.status === "waiting") {
      const tag = document.createElement("span");
      tag.className = "priority";
      tag.textContent = "Priority";
      statusCell.appendChild(tag);
    }

    makeCell(row, "Issued", formatTime(ticket.issuedAt));

    const wait = estimateWait(ticket);
    makeCell(row, "Estimated wait", wait === null ? "-" : "about " + wait + " min");

    // Staff-only action buttons
    const actions = document.createElement("td");
    actions.className = "actions staff-only";
    if (ticket.status === "waiting") {
      makeButton(actions, "Call", "", function () { setStatus(ticket, "called"); });
      makeButton(actions, ticket.priority ? "Remove priority" : "Make priority", "secondary",
        function () { togglePriority(ticket); });
      makeButton(actions, "Cancel", "danger", function () { setStatus(ticket, "cancelled"); });
    } else if (ticket.status === "called") {
      makeButton(actions, "Mark done", "", function () { setStatus(ticket, "done"); });
      makeButton(actions, "Cancel", "danger", function () { setStatus(ticket, "cancelled"); });
    }
    row.appendChild(actions);

    queueBody.appendChild(row);
  });
}

function render() {
  renderNowServing();
  renderQueue();
  updatedText.textContent = "Last updated " + formatTime(new Date()) + " (refreshes every 10 seconds)";
}

// ---------- Events ----------

// Role switch: CSS hides staff-only controls for patients.
function updateRoleControls() {
  const isStaff = roleSelect.value === "staff";
  avgInput.readOnly = !isStaff;
  avgInput.setAttribute("aria-readonly", String(!isStaff));
}

roleSelect.addEventListener("change", function () {
  document.body.dataset.role = roleSelect.value;
  updateRoleControls();
});

// Interaction 1: issue a token (form with browser validation + extra check).
issueForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const visit = document.getElementById("visit").value;

  if (!/^[A-Z]{2,3}$/.test(initials) || visit === "") {
    showMessage(issueMessage, "Enter 2 or 3 letters and choose a visit type.", "error");
    return;
  }

  const ticket = {
    number: nextNumber,
    initials: initials,
    visit: visit,
    status: "waiting",
    priority: false,
    issuedAt: new Date()
  };
  nextNumber += 1;
  tickets.push(ticket);

  showMessage(issueMessage,
    "Your token is " + tokenLabel(ticket) + ". Estimated wait: about " + estimateWait(ticket) + " min.",
    "ok");
  issueForm.reset();
  render();
});

// Interaction 2: check a token and show its position and estimated wait.
checkForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const value = document.getElementById("token-number").value;
  if (value === "") {
    showMessage(checkMessage, "Enter a token number.", "error");
    return;
  }

  const number = Number(value);
  const ticket = tickets.find(function (t) { return t.number === number; });
  if (!ticket) {
    showMessage(checkMessage, "Token A-" + number + " was not found.", "error");
    return;
  }

  if (ticket.status === "waiting") {
    const position = waitingList().indexOf(ticket) + 1;
    showMessage(checkMessage,
      tokenLabel(ticket) + " is number " + position + " in line. Estimated wait: about " +
      estimateWait(ticket) + " min.", "ok");
  } else {
    showMessage(checkMessage, tokenLabel(ticket) + " is " + ticket.status + ".", "");
  }
});

// Interaction 3: change the average minutes and recalculate every estimate.
avgInput.addEventListener("change", function () {
  if (roleSelect.value !== "staff") {
    avgInput.value = avgMinutes;
    return;
  }

  const value = Number(avgInput.value);
  if (!Number.isInteger(value) || value < 1 || value > 60) {
    avgInput.value = avgMinutes;
    showMessage(avgMessage, "Enter a whole number from 1 to 60.", "error");
    return;
  }
  avgMinutes = value;
  showMessage(avgMessage, "Estimates updated.", "ok");
  render();
});

// Staff: call the next waiting patient (priority first).
callNextButton.addEventListener("click", function () {
  const next = waitingList()[0];
  if (!next) {
    showMessage(staffMessage, "Nobody is waiting.", "error");
    return;
  }
  showMessage(staffMessage, "Calling " + tokenLabel(next) + ".", "ok");
  setStatus(next, "called");
});

// Filtering the queue.
filterStatus.addEventListener("change", renderQueue);
filterSearch.addEventListener("input", renderQueue);

// ---------- Start ----------
updateRoleControls();
render();

// Simulated polling: refresh the view on a timer, like a client would poll a server.
// In Assignment 2 this is where a fetch() to the API would go.
setInterval(render, 10000);
