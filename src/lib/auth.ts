export const isAuthed = () => localStorage.getItem('auth') === 'true';
export const login = (user: string, pass: string) => {
  if (user === 'admin' && pass === 'valkyrie') {
    localStorage.setItem('auth', 'true');
    return true;
  }
  return false;
};
