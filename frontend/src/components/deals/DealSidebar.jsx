import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Divider, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField, Chip, Tabs, Tab } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DEPARTMENT_LABELS } from '../../constants';

const DealSidebar = ({ deal, users, selectedParticipants, onParticipantsChange, onUpdateParticipants, selectedAccount, onAccountChange, onUpdateAccount }) => {
  const lead = deal.lead || {};
  const contact = lead.contact || {};
  const company = contact.company || {};
  
  // Стиль для меток
  const labelStyle = {
    color: 'text.disabled',
    width: '92px',
    flexShrink: 0,
    minWidth: '92px'
  };
  
  // Стиль для значения
  const valueStyle = {
    color: 'text.primary'
  };

  // Function to get department code by its label from DEPARTMENT_LABELS
  const getDeptCodeByLabel = (label) => {
    if (!label) return null;
    return Object.keys(DEPARTMENT_LABELS).find(key => DEPARTMENT_LABELS[key] === label);
  };

  // Преобразовать метку в код для фильтрации
  // deal.department is expected to be a label like "ШМБ"
  const deptCode = getDeptCodeByLabel(deal.department) || deal.department; // Fallback to deal.department if no code found (e.g. it's already a code)

  const [openAccDialog, setOpenAccDialog] = useState(false);
  const [localAccount, setLocalAccount] = useState(selectedAccount);
  const [openPartDialog, setOpenPartDialog] = useState(false);
  const [localSelected, setLocalSelected] = useState(selectedParticipants);
  // активная вкладка для потребности: запрос или валидация
  const [activeNeedTab, setActiveNeedTab] = useState('request');
  // флаг инициализации дефолтной вкладки
  const initialNeedTabSet = useRef(false);

  useEffect(() => {
    setLocalAccount(selectedAccount);
  }, [selectedAccount]);
  useEffect(() => {
    setLocalSelected(selectedParticipants);
  }, [selectedParticipants]);

  useEffect(() => {
    if (deal && !initialNeedTabSet.current) {
      setActiveNeedTab(deal.validated_need ? 'validated' : 'request');
      initialNeedTabSet.current = true;
    }
  }, [deal]);

  // Форматирует сумму: разделитель тысяч — пробел, 2 знака после запятой, 'грн.'
  const formatAmount = (amt) => {
    if (amt == null) return '—';
    const [int, frac] = Number(amt).toFixed(2).split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formattedInt},${frac} грн.`;
  };

  const handleOpenPart = () => {
    setLocalSelected(selectedParticipants);
    setOpenPartDialog(true);
  };
  const handleOpenAcc = () => {
    setLocalAccount(selectedAccount);
    setOpenAccDialog(true);
  };

  const handleClosePart = () => setOpenPartDialog(false);
  const handleCloseAcc = () => setOpenAccDialog(false);

  const handleSavePart = () => {
    onParticipantsChange(localSelected);
    onUpdateParticipants(localSelected); // передаем новый список участников
    setOpenPartDialog(false);
  };
  const handleSaveAcc = () => {
    onAccountChange(localAccount);
    onUpdateAccount(localAccount);
    setOpenAccDialog(false);
  };

  return (
    <Card
      elevation={0}
      sx={{ p: '2px', width: '100%', boxShadow: 'none', border: 'none', backgroundColor: 'grey.50' }}
    >
      <CardContent sx={{ p: '2px' }}>

        {/* Создаем общий стиль для меток с фиксированной шириной */}
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Продукт . . . </Box>
          <Box component="span" sx={valueStyle}>{deal.department || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Стоимость .</Box>
          <Box component="span" sx={valueStyle}>
            {formatAmount(deal.contract_amount)}
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Компания . .</Box>
          <Box component="span" sx={valueStyle}>{company.name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Контакт . . . .</Box>
          <Box component="span" sx={valueStyle}>{contact.name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Телефон . . . </Box>
          <Box component="span" sx={valueStyle}>
            <span>{contact.phone || '—'}</span>
            {contact.messenger && <span style={{ marginLeft: '4px' }}>({contact.messenger})</span>}
          </Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Email . . . . . . </Box>
          <Box component="span" sx={valueStyle}>{contact.email || '—'}</Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Вкладки запрос и потребность */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs
            value={activeNeedTab}
            onChange={(e, v) => setActiveNeedTab(v)}
            variant="fullWidth"
            sx={{ minHeight: '30px' }}
          >
            <Tab label="Обращение" value="request" sx={{ fontSize: '0.65rem', minHeight: '24px', py: 0 }} />
            <Tab label="Потребность" value="validated" sx={{ fontSize: '0.65rem', minHeight: '24px', py: 0 }} />
          </Tabs>
        </Box>
        {/* Контент вкладки */}
        <Box sx={{
          backgroundColor: 'grey.200',
          borderRadius: 0,
          p: '4px',
          mb: 1,
          width: '100%',
          height: '7.0em',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <Typography variant="body2" color="textPrimary" sx={{ fontSize: '0.75rem' }}>
            {activeNeedTab === 'request' ? (lead.need) : (deal.validated_need)}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Менеджер . </Box>
          <Box component="span" sx={valueStyle}>{deal.responsible?.full_name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={labelStyle}>Оператор . .</Box>
          <Box component="span" sx={valueStyle}>{deal.lead.converted_by?.full_name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          {deal.account_details?.full_name ? (
            // Если аккаунт добавлен
            <>
              <Box 
                component="span"
                onClick={handleOpenAcc}
                sx={{ 
                  ...labelStyle, 
                  cursor: 'pointer'
                }}
              >
                Аккаунт . . . .
              </Box>
              <Box component="span" sx={valueStyle}>{deal.account_details?.full_name}</Box>
            </>
          ) : (
            // Если аккаунт не добавлен
            <>
              <Box 
                component="button"
                onClick={handleOpenAcc}
                sx={{ 
                  color: 'text.disabled',
                  backgroundColor: 'grey.100',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  padding: '2px 6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'grey.200'
                  },
                  transition: 'background-color 0.3s',
                  width: '92px'
                }}
              >
                Аккаунт
              </Box>
              <Box component="span" sx={{ ...valueStyle, marginLeft: '8px' }}>не добавлен</Box>
            </>
          )}
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          {deal.participants_details && deal.participants_details.length > 0 ? (
            // Если участники добавлены
            <>
              <Box 
                component="span"
                onClick={handleOpenPart}
                sx={{ 
                  ...labelStyle, 
                  cursor: 'pointer'
                }}
              >
                Участники:
              </Box>
            </>
          ) : (
            // Если участники не добавлены
            <>
              <Box 
                component="button"
                onClick={handleOpenPart}
                sx={{ 
                  color: 'text.disabled',
                  backgroundColor: 'grey.100',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  padding: '2px 6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'grey.200'
                  },
                  transition: 'background-color 0.3s',
                  width: '92px'
                }}
              >
                Участники
              </Box>
              <Box component="span" sx={{ ...valueStyle, marginLeft: '8px' }}>не добавлены</Box>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', p: '1px' }}>
          {deal.participants_details && deal.participants_details.length > 0 ? (
            deal.participants_details.map(u => (
              <Chip
                key={u.id}
                label={u.full_name}
                size="small"
                sx={{ backgroundColor: 'grey.200', color: 'textSecondary', fontSize: '0.75rem' }}
              />
            ))
          ) : (
            <Typography variant="caption" color="textSecondary">
            
            </Typography>
          )}
        </Box>

        <Dialog open={openPartDialog} onClose={handleClosePart} fullWidth>
          <DialogTitle>Выбрать участников</DialogTitle>
          <DialogContent>
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => option.full_name}
              value={users.filter(u => localSelected.includes(u.id))}
              onChange={(e, newValue) => setLocalSelected(newValue.map(u => u.id))}
              renderInput={(params) => <TextField {...params} label="Участники" />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePart}>Отмена</Button>
            <Button onClick={handleSavePart} variant="contained">Сохранить</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openAccDialog} onClose={handleCloseAcc} fullWidth>
          <DialogTitle>Выбрать аккаунт-менеджера</DialogTitle>
          <DialogContent>
            <Autocomplete
              options={users.filter(u => u.role === 'account_manager' && u.department === deptCode)}
              getOptionLabel={(option) => option.full_name}
              value={users.find(u => u.id === localAccount) || null}
              onChange={(e, newValue) => setLocalAccount(newValue?.id)}
              renderInput={(params) => <TextField {...params} label="Аккаунт-менеджер" />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAcc}>Отмена</Button>
            <Button onClick={handleSaveAcc} variant="contained">Сохранить</Button>
          </DialogActions>
        </Dialog>

        <Divider sx={{ my: 1 }} />

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Лид: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{lead.name || '—'}</Box>
        </Typography>

        {/* Департаменты и ответственные менеджеры */}
        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Департаменты:</Box>
        </Typography>
        <Box component="ul" sx={{ m: 0, p: 0, pl: 2, mb: 1, listStyleType: 'none', fontSize: '0.85rem' }}>
          {deal.lead.department_assignments && Object.keys(deal.lead.department_assignments).length > 0 ? (
            Object.entries(deal.lead.department_assignments).map(([assignedDeptCode, managerId], i) => (
              <Box component="li" key={i} sx={{ mb: 0.5 }}>
                {DEPARTMENT_LABELS[assignedDeptCode] || assignedDeptCode} ({users.find(u => u.id === Number(managerId))?.full_name || '—'})
              </Box>
            ))
          ) : (
            <Box component="li" sx={{ color: 'textSecondary', mb: 0.5 }}>—</Box>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default DealSidebar;
