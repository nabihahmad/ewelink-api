module.exports = {
  getEmailDomain(email) {
    const domainMatch = email.match(/@([^@]+)$/);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1];
    }
    return null;
  },

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },
};
