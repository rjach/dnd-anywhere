// Shared by fixture pages: shows what a page received so tests can assert on it.
window.showFiles = function showFiles(files, prefix = "") {
  const names = [...files].map((file) => file.name).join(",");
  document.getElementById("result").textContent = prefix + names;
};
