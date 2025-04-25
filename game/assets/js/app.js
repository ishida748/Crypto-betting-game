document.addEventListener("DOMContentLoaded", function () {
  // Get references to the tabs
  const manualTab = document.getElementById("manual-tab");
  const automaticTab = document.getElementById("automatic-tab");

  // Function to handle tab switching
  function switchTab(activeTab, inactiveTab) {
    activeTab.classList.add("active");
    inactiveTab.classList.remove("active");
  }

  // Event listeners for tab clicks
  manualTab.addEventListener("click", () => {
    switchTab(manualTab, automaticTab);
    // Show Manual settings pane and hide Automatic settings pane
    document.getElementById("manual-settings").style.display = "block";
    document.getElementById("automatic-settings").style.display = "none";
  });

  automaticTab.addEventListener("click", () => {
    switchTab(automaticTab, manualTab);
    // Show Automatic settings pane and hide Manual settings pane
    document.getElementById("manual-settings").style.display = "none";
    document.getElementById("automatic-settings").style.display = "block";
  });

  // Event listener for Start button click
  document.querySelector(".start-button").addEventListener("click", () => {
    alert("Game Started");
  });

  // Default to showing Automatic settings pane
  document.getElementById("manual-settings").style.display = "block";
  document.getElementById("automatic-settings").style.display = "none";

  // Selecting input options
  const inputOptionsEls = document.querySelectorAll(".input-options");

  inputOptionsEls.forEach((inputOptions) => {
    const buttons = inputOptions.querySelectorAll("button");

    buttons.forEach((button) => {
      button.addEventListener("click", (evt) => {
        // Remove 'active' class from all buttons in the same inputOptions container
        buttons.forEach((btn) => btn.classList.remove("active"));

        // Add 'active' class to the clicked button
        button.classList.add("active");
      });
    });
  });
});
