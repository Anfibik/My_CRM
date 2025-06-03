import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';

// Справочники ролей и департаментов (должны совпадать с backend)
const ROLE_CHOICES = [
  { value: 'owner', label: 'Собственник' },
  { value: 'sales_manager', label: 'Менеджер по продажам' },
  { value: 'project_manager', label: 'Проектный менеджер' },
  { value: 'account_manager', label: 'Аккаунт менеджер' },
  { value: 'logistic', label: 'Логист' },
  { value: 'engineer', label: 'Инженер' },
  { value: 'warehouse_worker', label: 'Кладовщик' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'lawyer', label: 'Юрист' },
  { value: 'top_manager', label: 'ТОП Менеджер' },
  { value: 'call_operator', label: 'Оператор кол-центра' },
];

const DEPARTMENT_CHOICES = [
  { value: 'warehouses', label: 'ШМБ' },
  { value: 'racks', label: 'Стеллажные системы' },
  { value: 'warehouses_machines', label: 'Складская техника' },
  { value: 'plastic_containers', label: 'Пластиковая тара' },
  { value: 'trash_bins', label: 'Мусорные баки' },
  { value: 'sorting_systems', label: 'Системы сортировки' },
  { value: 'automation', label: 'Автоматизация' },
  { value: 'services', label: 'Сервисные услуги' },
  { value: 'administrations', label: 'Администрация' },
  { value: 'logistics', label: 'Логистика' },
  { value: 'finance', label: 'Финансы и бухгалтерия' },
  { value: 'marketing', label: 'Маркетинг' },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, error } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    work_phone: '',
    work_email: '',
    role: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'confirmPassword' || name === 'password') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await signup({
        full_name: formData.full_name,
        work_phone: formData.work_phone,
        work_email: formData.work_email,
        role: formData.role,
        department: formData.department,
        password: formData.password,
        password2: formData.confirmPassword,
      });
      navigate('/');
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
          </Typography>
          {(error || passwordError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || passwordError}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Полное имя"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Рабочий телефон"
              name="work_phone"
              value={formData.work_phone}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Рабочая почта"
              name="work_email"
              type="email"
              value={formData.work_email}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Роль"
              name="role"
              value={formData.role}
              onChange={handleChange}
              margin="normal"
              required
              SelectProps={{ native: true }}
            >
              <option value="">Выберите роль</option>
              {ROLE_CHOICES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Департамент"
              name="department"
              value={formData.department}
              onChange={handleChange}
              margin="normal"
              required
              SelectProps={{ native: true }}
            >
              <option value="">Выберите департамент</option>
              {DEPARTMENT_CHOICES.map((dep) => (
                <option key={dep.value} value={dep.value}>{dep.label}</option>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Пароль"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label="Подтверждение пароля"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
              error={!!passwordError}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default SignupPage;