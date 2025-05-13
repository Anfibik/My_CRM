import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Divider, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField, Chip, Tabs, Tab } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const DealSidebar = ({ deal, users, selectedParticipants, onParticipantsChange, onUpdateParticipants, selectedAccount, onAccountChange, onUpdateAccount }) => {
  const lead = deal.lead || {};
  const contact = lead.contact || {};
  const company = contact.company || {};
  
  // Общий стиль для меток с точками
  // Создаем функцию, которая будет возвращать стиль для каждой метки
  const getLabelStyle = (labelText) => ({
    color: 'text.disabled', 
    width: '92px', 
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'flex-end', // Выравнивание по нижнему краю
    '& .label-text': {
      position: 'relative',
      backgroundColor: 'grey.50',
      zIndex: 2,
      marginBottom: '2px' // Добавляем отступ снизу, чтобы текст не касался точек
    },
    '& .dots': {
      flex: 1,
      overflow: 'hidden',
      height: '1px',
      borderBottom: '1px dotted rgba(0,0,0,0.2)',
      marginLeft: '4px',
      marginRight: '4px',
      position: 'relative',
      bottom: '4px' // Располагаем точки по нижнему краю
    }
  });
  
  // Стиль для значения
  const valueStyle = {
    color: 'text.primary',
    paddingLeft: '4px'
  };

  // Маппинг русской метки отдела в технический код
  const labelToCode = {
    "ШМБ": "warehouses",
    "Стеллажные системы": "racks",
    "Складская техника": "warehouses_machines",
    "Пластиковая тара": "plastic_containers",
    "Мусорные баки": "trash_bins",
    "Системы сортировки": "sorting_systems",
    "Автоматизация": "automation",
    "Сервисные услуги": "services",
    "Администрация": "administrations",
    "Логистика": "logistics",
    "Финансы и бухгалтерия": "finance",
    "Маркетинг": "marketing"
  };

  const codeToLabel = Object.fromEntries(
    Object.entries(labelToCode).map(([label, code]) => [code, label])
  );

  // Преобразовать метку в код для фильтрации
  const deptCode = labelToCode[deal.department] || deal.department;

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
      sx={{ p: '4px', width: '100%', boxShadow: 'none', border: 'none', backgroundColor: 'grey.50' }}
    >
      <CardContent sx={{ p: '2px' }}>

        {/* Создаем общий стиль для меток с фиксированной шириной */}
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Продукт')}>
            <span className="label-text">Продукт</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {deal.department || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Стоимость')}>
            <span className="label-text">Стоимость</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>
            : {formatAmount(deal.contract_amount)}
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Компания')}>
            <span className="label-text">Компания</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {company.name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Контакт')}>
            <span className="label-text">Контакт</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {contact.name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Телефон')}>
            <span className="label-text">Телефон</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>
            : <span>{contact.phone || '—'}</span>
            {contact.messenger && <span style={{ marginLeft: '4px' }}>({contact.messenger})</span>}
          </Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Email')}>
            <span className="label-text">Email</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {contact.email || '—'}</Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Вкладки запрос и потребность */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs
            value={activeNeedTab}
            onChange={(e, v) => setActiveNeedTab(v)}
            variant="fullWidth"
            sx={{ minHeight: '25px' }}
          >
            <Tab label="Обращение" value="request" sx={{ fontSize: '0.65rem', minHeight: '24px', py: 0 }} />
            <Tab label="Потребность" value="validated" sx={{ fontSize: '0.65rem', minHeight: '24px', py: 0 }} />
          </Tabs>
        </Box>
        {/* Контент вкладки */}
        <Box sx={{
          backgroundColor: 'grey.200',
          borderRadius: 2,
          p: '6px',
          mb: 1,
          width: '100%',
          height: '6.0em',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <Typography variant="body2" color="textPrimary">
            {activeNeedTab === 'request' ? (lead.need) : (deal.validated_need)}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Менеджер')}>
            <span className="label-text">Менеджер</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {deal.responsible?.full_name || '—'}</Box>
        </Box>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box component="span" sx={getLabelStyle('Оператор')}>
            <span className="label-text">Оператор</span>
            <span className="dots"></span>
          </Box>
          <Box component="span" sx={valueStyle}>: {deal.lead.converted_by?.full_name || '—'}</Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center', 
            width: '92px', 
            flexShrink: 0
          }}>
            {deal.account_details?.full_name ? (
              // Если аккаунт добавлен, стиль как у обычной метки
              <>
                <Box 
                  component="span"
                  className="label-text" 
                  onClick={handleOpenAcc}
                  sx={{ 
                    color: 'text.disabled', // Такой же цвет как у всех меток
                    backgroundColor: 'grey.50',
                    cursor: 'pointer' // По-прежнему кликабельная
                  }}
                >
                  Аккаунт
                </Box>
                <span className="dots" style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  height: '1px', 
                  borderBottom: '1px dotted rgba(0,0,0,0.2)', 
                  marginLeft: '4px', 
                  marginRight: '4px', 
                  position: 'relative', 
                  bottom: '4px' 
                }}></span>
              </>
            ) : (
              // Если аккаунт не добавлен, оформляем как кнопку без точек
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
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'grey.200'
                  },
                  transition: 'background-color 0.3s',
                  width: '100%' // Заполняем всю ширину
                }}
              >
                Аккаунт
              </Box>
            )}
          </Box>
          <Box component="span" sx={valueStyle}>: {deal.account_details?.full_name}</Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center', 
            width: '92px', 
            flexShrink: 0
          }}>
            {deal.participants_details && deal.participants_details.length > 0 ? (
              // Если участники добавлены, стиль как у обычной метки
              <>
                <Box 
                  component="span"
                  className="label-text" 
                  onClick={handleOpenPart}
                  sx={{ 
                    color: 'text.disabled', 
                    backgroundColor: 'grey.50',
                    cursor: 'pointer'
                  }}
                >
                  Участники
                </Box>
                <span className="dots" style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  height: '1px', 
                  borderBottom: '1px dotted rgba(0,0,0,0.2)', 
                  marginLeft: '4px', 
                  marginRight: '4px', 
                  position: 'relative', 
                  bottom: '4px' 
                }}></span>
              </>
            ) : (
              // Если участники не добавлены, оформляем как кнопку
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
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'grey.200'
                  },
                  transition: 'background-color 0.3s',
                  width: '100%' 
                }}
              >
                Участники
              </Box>
            )}
          </Box>
          <Box component="span" sx={valueStyle}>:</Box>
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
            Object.entries(deal.lead.department_assignments).map(([deptCode, managerId], i) => (
              <Box component="li" key={i} sx={{ mb: 0.5 }}>
                {codeToLabel[deptCode] || deptCode} ({users.find(u => u.id === Number(managerId))?.full_name || '—'})
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
