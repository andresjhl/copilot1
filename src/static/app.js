document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section (rendered below as DOM nodes)
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const heading = document.createElement("h5");
        heading.textContent = `Participants (${participants.length})`;
        participantsSection.appendChild(heading);

        if (participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          participants.forEach((p) => {
            const li = document.createElement("li");

            const avatar = document.createElement("span");
            avatar.className = "participant-avatar";
            // generate simple initials from the portion before '@'
            const namePart = String(p).split("@")[0] || "";
            avatar.textContent = namePart.slice(0, 2).toUpperCase();

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;
            // delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "participant-delete";
            deleteBtn.setAttribute("title", "Remove participant");
            deleteBtn.innerHTML = "&times;"; // simple × icon

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            ul.appendChild(li);

            // Delete handler: unregister participant from activity
            deleteBtn.addEventListener("click", async (evt) => {
              evt.preventDefault();
              // simple confirmation
              if (!confirm(`Remove ${p} from ${name}?`)) return;

              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                const resJson = await res.json().catch(() => ({}));

                if (res.ok) {
                  // remove from DOM
                  li.remove();

                  // update participants heading count
                  const currentCountMatch = heading.textContent.match(/\d+/);
                  const currentCount = currentCountMatch ? parseInt(currentCountMatch[0], 10) : participants.length;
                  const newCount = Math.max(0, currentCount - 1);
                  heading.textContent = `Participants (${newCount})`;

                  // update availability text (increase spots by 1)
                  const availabilityEl = activityCard.querySelector('.availability');
                  if (availabilityEl) {
                    const numMatch = availabilityEl.textContent.match(/(\d+) spots/);
                    const num = numMatch ? parseInt(numMatch[1], 10) : spotsLeft;
                    availabilityEl.innerHTML = `<strong>Availability:</strong> ${num + 1} spots left`;
                  }

                  // show transient success message
                  messageDiv.textContent = resJson.message || `Removed ${p} from ${name}`;
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 3000);
                } else {
                  messageDiv.textContent = resJson.detail || "Failed to remove participant";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                }
              } catch (error) {
                console.error("Error removing participant:", error);
                messageDiv.textContent = "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            });
          });

          participantsSection.appendChild(ul);
        } else {
          const noP = document.createElement("p");
          noP.className = "no-participants";
          noP.textContent = "No participants yet — be the first!";
          participantsSection.appendChild(noP);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list so the newly signed-up participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
