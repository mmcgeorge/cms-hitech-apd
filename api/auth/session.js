const defaultCookies = require('cookies');
const jwt = require('jsonwebtoken');
const logger = require('../logger')('auth session');

const COOKIE_NAME = 'token';
const TOKEN_ISSUER = 'CMS eAPD API';

/**
 * Load a session from client cookie
 * @param {Object} req - Express request object
 * @param {Object} options - Options
 * @param {Object} options.Cookies - Injected cookie library; defaults to
 *                                   cookies; primary for unit testing
 */
const loadSession = (req, cookie) => {
  try {
    logger.silly(req, 'verifying JWT auth token');
    const valid = jwt.verify(cookie, process.env.SESSION_SECRET, {
      // Explicitly set the algorithm we expect; otherwise, an attacker could
      // rewrite the token and set the algorithm to 'none', bypassing our
      // signature checks
      algorithms: ['HS256']
    });

    // Make sure we issued the token.
    if (valid.iss !== TOKEN_ISSUER) {
      throw new Error(`jwt issuer [${valid.iss}] is invalid`);
    }

    // Return the session contents
    return valid.payload;
  } catch (err) {
    // If the token is invalid, return an empty object rather than failing.
    // An invalid token does not necessarily mean the request needs to be
    // terminated (e.g., the token may have expired, so the user needs to
    // be redirected to a login page).
    logger.error(req, `invalid auth token: ${err.message}`);
    return {};
  }
};

/**
 * Returns an Express middleware for handling sessions
 */
module.exports = ({ Cookies = defaultCookies } = {}) => {
  const session = { content: {} };

  /**
   * Express middleware for managing client-side sessions via JWT
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - next() callback
   */
  const middleware = (req, res, next) => {
    const cookies = new Cookies(req, res);

    session.content = loadSession(req, cookies.get(COOKIE_NAME));

    // Add a session object to the request and configure it to modify
    // session.content rather than the actual session object, so we
    // can be sure the session variable doesn't get mangled
    Object.defineProperty(req, 'session', {
      get: () => session.content,
      set: v => {
        session.content = v;
      }
    });

    // Hijack the response method that writes headers so we can write our
    // cookie beforehand.
    const writeHead = res.writeHead;
    res.writeHead = (...args) => {
      // Only write a cookie if the session content has stuff in it.
      if (Object.keys(session.content).length) {
        logger.silly('writing session cookie to headers');

        // Cookie value is a JWT whose body is an issuer tag and the contents
        // of session.content as the token payload.  The JWT is signed with
        // the SESSION_SECRET env var, explicitly sets the algorithm, and sets
        // an expiration date.
        cookies.set(
          COOKIE_NAME,
          jwt.sign(
            { iss: 'CMS eAPD API', payload: session.content },
            process.env.SESSION_SECRET,
            {
              algorithm: 'HS256',
              expiresIn: `${process.env.SESSION_LIFETIME_MINUTES}m`
            }
          ),
          { httpOnly: true }
        );
      } else {
        // Else, write a cookie with an immediate expiration
        logger.silly('expiring/setting empty session cookie');
        cookies.set(COOKIE_NAME, '', { maxAge: 0, httpOnly: true });
      }

      // Now call the original writeHead method
      return writeHead.apply(res, args);
    };

    next();
  };

  /**
   * Destroy the current session, which will lead to the cookie being
   * immediately expired
   */
  middleware.destroy = () => {
    logger.verbose('destroying user session');
    session.content = {};
  };

  return middleware;
};
