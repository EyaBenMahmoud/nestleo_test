import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { getUser } from '../../services/api';
import { useDispatch } from 'react-redux';
import { setisUserLoggedIn, setUser } from '../../slices/login/loginSlice';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoLight from "../../assets/images/logo-light.png";

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const DirectLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('Token from URL:', token);

    if (!token) {
      setError('Invalid login attempt.');
      setLoading(false);

      // Auto redirect after delay
      setTimeout(() => {
        navigate('/connect');
      }, 3000);

      return;
    }

    api.post(`${process.env.REACT_APP_API_URL}/auth/direct-login`, { token }, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => {
        console.log('Backend response:', response.data);
        if (!response.data?.token) {
          throw new Error('Token not found in response');
        }

        localStorage.setItem('token', response.data.token);
        dispatch(setisUserLoggedIn(true));

        const u = getUser(response.data.token);
        dispatch(setUser(u));

        if (!u.isActive) {
          setError('Your account is deactivated!');

          // Auto redirect after delay
          setTimeout(() => {
            navigate('/connect');
          }, 3000);
        } else {
          setSuccess(true);

          // Auto redirect after delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      })
      .catch((error) => {
        console.error('Login error:', error);
        setError('Login failed. Please try again.');

        // Auto redirect after delay
        setTimeout(() => {
          navigate('/connect');
        }, 3000);
      })
      .finally(() => setLoading(false));

  }, [searchParams, navigate, dispatch]);

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <ToastContainer />

      <div className="container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="nestly-auth-card" style={{
          maxWidth: '500px',
          width: '100%',
          margin: '0 auto'
        }}>
          <div className="nestly-auth-row">
            <div className="nestly-auth-col-right" style={{
              flex: '1 0 100%',
              maxWidth: '100%',
              padding: '3rem 2rem'
            }}>
              <div className="nestly-auth-header text-center">
                <div className="mb-4">
                  <Link to="/" className="d-inline-block">
                    <img src={logoLight} alt="Nestleo" height="30" />
                  </Link>
                </div>

                {/* Rest of your content remains the same */}
                {loading ? (
                  <>
                    <h3>Logging you in...</h3>
                    <p>Please wait while we verify your credentials</p>
                  </>
                ) : error ? (
                  <>
                    <h3>Login Failed</h3>
                    <p className="text-danger">{error}</p>
                    <p className="mt-3">Redirecting you to login page...</p>
                  </>
                ) : success ? (
                  <>
                    <h3>Login Successful!</h3>
                    <p className="text-success">You are being redirected to your dashboard...</p>
                  </>
                ) : (
                  <p>Processing your request...</p>
                )}
              </div>

              {/* Spinner and icons */}
              <div className="text-center my-4">
                {/* Your existing code here */}
              </div>

              {/* Return to login link */}
              {!loading && (
                <div className="text-center mt-4">
                  <Link to="/connect" className="nestly-auth-link">
                    Return to Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectLogin;