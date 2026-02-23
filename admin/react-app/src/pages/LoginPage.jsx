import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const LoginPage = () => {
  const { t } = useTranslation();
  const { getCurrentColors } = useTheme();
  const navigate = useNavigate();
  const currentColors = getCurrentColors();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get campus settings from window
  const campusLogo = window.qe_data?.campus_logo || '';
  const homeUrl = window.qe_data?.home_url || '/';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${window.qe_data.home_url}/wp-login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include',
        body: new URLSearchParams({
          log: formData.username,
          pwd: formData.password,
          rememberme: formData.remember ? 'forever' : '',
          'wp-submit': 'Log In',
          redirect_to: window.location.origin + window.location.pathname,
          testcookie: '1'
        })
      });

      if (response.ok || response.redirected) {
        // Login successful, reload the page to get new user data
        window.location.reload();
      } else {
        setError(t('login.invalidCredentials') || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login.error') || 'Error al iniciar sesión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${currentColors.primary}15 0%, ${currentColors.primary}05 100%)`
      }}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl p-12"
        style={{ backgroundColor: currentColors.background }}
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          {campusLogo ? (
            <img 
              src={campusLogo} 
              alt="Campus" 
              className="h-16 mx-auto object-contain mb-4"
            />
          ) : (
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: currentColors.primary }}
            >
              Campus
            </h1>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-semibold mb-2"
            style={{ color: currentColors.primary }}
          >
            {t('login.welcomeBack') || 'Bienvenido de vuelta'}
          </h2>
          <p 
            className="text-sm"
            style={{ color: `${currentColors.primary}80` }}
          >
            {t('login.signInToContinue') || 'Inicia sesión para continuar'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div 
            className="mb-6 p-4 rounded-lg text-sm"
            style={{ 
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c00'
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium mb-2"
              style={{ color: currentColors.primary }}
            >
              {t('login.username') || 'Usuario o correo electrónico'}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none"
              style={{
                borderColor: `${currentColors.primary}30`,
                backgroundColor: currentColors.secondaryBackground,
                color: currentColors.primary
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentColors.primary;
                e.target.style.boxShadow = `0 0 0 3px ${currentColors.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${currentColors.primary}30`;
                e.target.style.boxShadow = 'none';
              }}
              placeholder={t('login.usernamePlaceholder') || 'tu@email.com'}
            />
          </div>

          {/* Password */}
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{ color: currentColors.primary }}
            >
              {t('login.password') || 'Contraseña'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none pr-12"
                style={{
                  borderColor: `${currentColors.primary}30`,
                  backgroundColor: currentColors.secondaryBackground,
                  color: currentColors.primary
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentColors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${currentColors.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${currentColors.primary}30`;
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors"
                style={{ color: `${currentColors.primary}60` }}
                onMouseEnter={(e) => e.currentTarget.style.color = currentColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = `${currentColors.primary}60`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
              className="w-4 h-4 rounded mr-2"
              style={{ accentColor: currentColors.primary }}
            />
            <label 
              htmlFor="remember" 
              className="text-sm cursor-pointer"
              style={{ color: `${currentColors.primary}80` }}
            >
              {t('login.rememberMe') || 'Recordarme'}
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: currentColors.primary,
              color: '#ffffff',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 20px ${currentColors.primary}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>{t('login.signingIn') || 'Iniciando sesión...'}</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>{t('login.signIn') || 'Iniciar Sesión'}</span>
              </>
            )}
          </button>
        </form>

        {/* Forgot password link */}
        <div className="mt-6 text-center">
          <a
            href={`${homeUrl}/wp-login.php?action=lostpassword`}
            className="text-sm font-medium transition-opacity"
            style={{ color: currentColors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {t('login.forgotPassword') || '¿Olvidaste tu contraseña?'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
