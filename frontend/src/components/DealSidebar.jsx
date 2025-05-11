import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Divider, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField, Chip, Tabs, Tab } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const DealSidebar = ({ deal, users, selectedParticipants, onParticipantsChange, onUpdateParticipants, selectedAccount, onAccountChange, onUpdateAccount }) => {
  const lead = deal.lead || {};
  const contact = lead.contact || {};
  const company = contact.company || {};

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

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Продукт: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{deal.department || '—'}</Box>
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Стоимость: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>
            {formatAmount(deal.contract_amount)}
          </Box>
        </Typography>

        <Divider sx={{ my: 1 }} />

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Компания: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{company.name || '—'}</Box>
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Контакт: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{contact.name || '—'}</Box>
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Телефон: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{contact.phone || '—'} </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>({contact.messenger || '—'})</Box>
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Email: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{contact.email || '—'}</Box>
        </Typography>

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

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Менеджер: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>{deal.responsible?.full_name || '—'}</Box>
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <Box component="span" sx={{ color: 'text.disabled' }}>Оператор: </Box>
          <Box component="span" sx={{ color: 'text.primary' }}>
            {deal.lead.converted_by?.full_name || '—'}
          </Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, p: '2px' }}>
          <Typography variant="body2" sx={{ mb: 0 }}>
            <Box component="span" sx={{ color: 'text.disabled' }}>Аккаунт: </Box>
            <Box component="span" sx={{ color: 'text.primary' }}>{deal.account_details?.full_name || '—'}</Box>
          </Typography>
          <IconButton size="small" onClick={handleOpenAcc}>
            <EditIcon sx={{ fontSize: '12px' }} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, p: '2px' }}>
          <Typography variant="body2" color="textDisabled" sx={{}}>
            Участники:
          </Typography>
          <IconButton size="small" onClick={handleOpenPart}>
            <EditIcon sx={{ fontSize: '12px' }} />
          </IconButton>
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
              —
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
