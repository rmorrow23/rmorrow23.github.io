function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Function to toggle project details visibility and button text
function toggleDetails(projectId, buttonId) {
    const projectCard = document.getElementById(projectId);
    const expandButton = document.getElementById(buttonId);
    projectCard.classList.toggle('expanded');

    // Toggle button text based on the current state
    if (projectCard.classList.contains('expanded')) {
        expandButton.textContent = "See Less";
    } else {
        expandButton.textContent = "Click to Expand";
    }
}
