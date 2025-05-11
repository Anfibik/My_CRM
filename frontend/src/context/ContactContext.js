import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getContacts as getContactsApi,
  createContact as createContactApi,
  deleteContact as deleteContactApi,
  updateContact as updateContactApi,
} from '../api/contacts';

const ContactContext = createContext();

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactProvider');
  }
  return context;
};

export const ContactProvider = ({ children }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getContactsApi();
      const result = Array.isArray(response) ? response : response.results || [];
      setContacts(result);
      console.log('CONTACTS FROM API:', response); // LOG: API raw response
      console.log('CONTACTS SET TO STATE:', result);    // LOG: What is set to state
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch contacts');
      console.log('CONTACTS FETCH ERROR:', err);         // LOG: Error fetching contacts
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(async (contactData) => {
    setLoading(true);
    setError('');
    try {
      const response = await createContactApi(contactData);
      setContacts((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create contact');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteContact = useCallback(async (contactId) => {
    setLoading(true);
    setError('');
    try {
      await deleteContactApi(contactId);
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete contact');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContact = useCallback(async (contactId, contactData) => {
    setLoading(true);
    setError('');
    try {
      const updatedContact = await updateContactApi(contactId, contactData);
      setContacts(prev => prev.map(contact => contact.id === contactId ? updatedContact : contact));
      return updatedContact;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update contact');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const value = {
    contacts,
    loading,
    error,
    getContacts,
    createContact,
    deleteContact,
    updateContact,
    clearError,
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
}; 