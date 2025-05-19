import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/companies';
import ErrorDisplay from '../components/common/ErrorDisplay';

const CompanyContext = createContext(null);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({
    timestamp: null,
    data: null
  });

  const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

  const fetchCompanies = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Проверяем кэш, если не форсируем обновление
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      setCompanies(cache.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCompanies();
      setCompanies(data);
      setCache({
        timestamp: now,
        data
      });
    } catch (error) {
      setError(error);
      console.error('Ошибка при загрузке компаний:', error);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const addCompany = async (companyData) => {
    setLoading(true);
    setError(null);

    try {
      const newCompany = await createCompany(companyData);
      setCompanies(prev => [...prev, newCompany]);
      // Обновляем кэш
      setCache(prev => ({
        ...prev,
        data: [...prev.data, newCompany]
      }));
      return newCompany;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const editCompany = async (id, companyData) => {
    setLoading(true);
    setError(null);

    try {
      const updatedCompany = await updateCompany(id, companyData);
      setCompanies(prev => 
        prev.map(company => company.id === id ? updatedCompany : company)
      );
      // Обновляем кэш
      setCache(prev => ({
        ...prev,
        data: prev.data.map(company => company.id === id ? updatedCompany : company)
      }));
      return updatedCompany;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeCompany = async (id) => {
    setLoading(true);
    setError(null);

    try {
      await deleteCompany(id);
      setCompanies(prev => prev.filter(company => company.id !== id));
      // Обновляем кэш
      setCache(prev => ({
        ...prev,
        data: prev.data.filter(company => company.id !== id)
      }));
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    companies,
    loading,
    error,
    fetchCompanies,
    addCompany,
    editCompany,
    removeCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {error && <ErrorDisplay error={error} />}
      {children}
    </CompanyContext.Provider>
  );
}; 