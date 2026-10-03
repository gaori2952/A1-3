export function archiveEntries(state, userId) {
  const ownedProjects = state.projects.filter(project => project.user_id === userId);
  const ids = new Set(ownedProjects.map(project => project.id));
  const ownedTasks = state.tasks.filter(task => task.user_id === userId && ids.has(task.project_id));
  const projects = ownedProjects.filter(project => {
    const tasks = ownedTasks.filter(task => task.project_id === project.id);
    return project.status !== 'active' || (tasks.length > 0 && tasks.every(task => task.completed));
  });
  const byDate = (a, b) => (b.updated_at || '').localeCompare(a.updated_at || '');
  return { projects: projects.sort(byDate), tasks: ownedTasks.filter(task => task.completed).sort(byDate) };
}
