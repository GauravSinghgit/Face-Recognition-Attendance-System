import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

// Configure axios base URL and API prefix
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Important for CORS
  timeout: 30000, // Increased to 30 seconds
});

// Debug logging
console.log('API endpoint configured as:', `${BASE_URL}${API_PREFIX}`);

// Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  identifier: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

// Helper function to check if server is available
const checkServerAvailability = async () => {
  try {
    // Try localhost first
    try {
      await axios.get(`${BASE_URL}/`, { 
        timeout: 5000,
        withCredentials: true,  // Important for CORS
        headers: {
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000'
        }
      });
      return true;
    } catch (error) {
      // If localhost fails, try 127.0.0.1
      const altBaseUrl = BASE_URL.replace('localhost', '127.0.0.1');
      await axios.get(`${altBaseUrl}/`, { 
        timeout: 5000,
        withCredentials: true,  // Important for CORS
        headers: {
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:3000'
        }
      });
      return true;
    }
  } catch (error) {
    console.log('Server availability check failed:', error);
    return false;
  }
};

// Helper function to handle API errors
const handleApiError = (error: any): string => {
  if (axios.isCancel(error)) {
    return 'Request was cancelled. Please check if the server is running and try again.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check if the server is running and try again.';
  }

  if (!error.response) {
    return 'Network error. Please check if the server is running and your connection.';
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    switch (status) {
      case 400:
        return detail || 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please check your credentials.';
      case 404:
        return 'Service not found. Please make sure the server is running.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return detail || 'An unexpected error occurred. Please try again.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
};

// Async thunks
export const login = createAsyncThunk<
  { user: User; token: string },
  { username: string; password: string }
>('auth/login', async ({ username, password }, { signal }) => {
  try {
    console.log('Attempting login for:', username);
    
    // Create cancel token source
    const source = axios.CancelToken.source();
    
    // Setup timeout
    const timeoutId = setTimeout(() => {
      source.cancel('Request took too long');
    }, 10000);

    // FastAPI OAuth2 expects form data with specific format
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cancelToken: source.token,
      signal,
    });
    
    clearTimeout(timeoutId);
    
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);

    // Get user profile
    const userResponse = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
      cancelToken: source.token,
      signal,
    });

    console.log('Login successful for:', username);
    return {
      user: userResponse.data,
      token: access_token,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    throw handleApiError(error);
  }
});

export const register = createAsyncThunk<
  User,
  { 
    email: string; 
    password: string; 
    first_name: string;
    last_name: string;
    identifier: string;
    role: string;
  }
>('auth/register', async (data, { signal }) => {
  try {
    // First check if server is available
    const isServerAvailable = await checkServerAvailability();
    if (!isServerAvailable) {
      throw new Error('Server is not available. Please make sure it is running.');
    }

    console.log('Attempting registration for:', data.email);
    console.log('Making request to:', `${BASE_URL}${API_PREFIX}/auth/register`);
    
    const response = await apiClient.post('/auth/register', data, {
      signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Registration successful for:', data.email);
    return response.data;
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw handleApiError(error);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;