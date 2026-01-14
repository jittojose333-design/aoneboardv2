'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Package,
  Wallet,
  ChevronRight,
  LayoutDashboard,
  CreditCard,
  History,
  Settings,
  Bell,
  User,
  Building2,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  MoreVertical,
  ArrowUpDown,
  ArrowLeft,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  LayoutList,
  IndianRupee,
  Layers,
  Shield,
  Lock,
  ArrowRight,
  X
} from 'lucide-react';
import { Order, Income, Expense, PaymentStatus, Panchayat, DateRange, BoardPrices, ExpenseCategory } from '../types';
import { parseExcelFile, formatCurrency, isDateInRange } from '../lib/utils';
import { supabase } from '../utils/supabaseClient';

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'expenses' | 'panchayats' | 'admin'>('dashboard');
  const [selectedPanchayatDetails, setSelectedPanchayatDetails] = useState<Panchayat | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'All'>('All');
  const [dateRange, setDateRange] = useState<DateRange>('all-time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals state
  const [showPanchayatModal, setShowPanchayatModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPanchayatId, setSelectedPanchayatId] = useState<string>('');
  const [importBoardType, setImportBoardType] = useState<keyof BoardPrices>('type1');
  const [editingPanchayat, setEditingPanchayat] = useState<Panchayat | null>(null);
  const [pastedData, setPastedData] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false); // New State for Sync

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'order' | 'panchayat' } | null>(null);

  // Expense & Category Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedExpenseCatId, setSelectedExpenseCatId] = useState<string>('');

  // Duplicate Check State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateList, setDuplicateList] = useState<string[]>([]);

  // Custom NREGA URL State
  const [nregaUrl, setNregaUrl] = useState('https://nregastrep.nic.in/netnrega/materialwise_exp.aspx?lflag=eng&flg=v&state_code=16&state_name=KERALA&page=s&fin_year=2025-2026&Digest=iGHV9dpfm0nO4UVhdORvSQ');
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  // Category State
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [localCatFilter, setLocalCatFilter] = useState<string | null>(null);

  // Default prices for new panchayats
  const initialPrices: BoardPrices = { type1: 0, type2: 0, type3: 0, type4: 0 };

  // Load from localStorage
  // Load from Supabase (Cloud First) then LocalStorage (Backup)
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        setIsFetching(true);
        // 1. Fetch Panchayats
        const { data: pData, error: pError } = await supabase.from('panchayats').select('*');
        if (pData) {
          const mappedP = pData.map(p => ({
            id: p.id,
            name: p.name,
            contactPerson: p.contact_person,
            phone: p.phone,
            boardPrices: p.board_prices || initialPrices,
            vendors: p.vendors || [],
            district: p.district,
            block: p.block,
            nregaGP: p.nrega_gp,
            createdAt: p.created_at || new Date().toISOString()
          }));
          setPanchayats(mappedP);
        }

        // 2. Fetch Categories (Already Correct)
        const { data: cData } = await supabase.from('expense_categories').select('*');
        if (cData) {
          const mappedC = cData.map(c => ({
            id: c.id,
            name: c.name,
            subCategories: c.sub_categories,
            isPanchayatLinked: c.is_panchayat_linked
          }));
          setCategories(mappedC);
        }

        // 3. Fetch Expenses (Already Correct)
        const { data: eData } = await supabase.from('expenses').select('*');
        if (eData) {
          const mappedE = eData.map(e => ({
            id: e.id,
            date: e.date,
            description: e.description,
            amount: e.amount,
            categoryId: e.category_id,
            categoryName: e.category_name,
            subCategory: e.sub_category,
            panchayatId: e.panchayat_id
          }));
          setExpenses(mappedE);
        }

        // 4. Fetch Orders (Add missing fields)
        const { data: oData } = await supabase.from('orders').select('*');
        if (oData) {
          const mappedO = oData.map(o => ({
            id: o.id,
            date: o.date,
            workCode: o.work_code,
            workName: o.work_name,
            panchayatId: o.panchayat_id,
            panchayatName: o.panchayat_name,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
            amount: o.amount,
            status: o.status,
            isPlaced: o.is_placed,
            paymentDate: o.payment_date,
            verifiedAmount: o.verified_amount,
            verifiedDate: o.verified_date,
            isVerified: o.is_verified,
            // Fallbacks for optional/new fields
            quantity: 1,
            rate: 0,
            boardType: 'type1' as keyof BoardPrices
          }));
          setOrders(mappedO);
        }
        setIsLoaded(true); // Enable UI
      } catch (error) {
        console.error("Cloud Fetch Error:", error);
        // Fallback to LocalStorage if Cloud fails
        setIsLoaded(true);
      } finally {
        setIsFetching(false);
      }
    };

    fetchCloudData();
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) localStorage.setItem('aone-orders', JSON.stringify(orders));
  }, [orders, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('aone-expenses', JSON.stringify(expenses));
  }, [expenses, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('aone-incomes', JSON.stringify(incomes));
  }, [incomes, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('aone-panchayats', JSON.stringify(panchayats));
  }, [panchayats, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('aone-categories', JSON.stringify(categories));
  }, [categories, isLoaded]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const p = panchayats.find(p => p.id === selectedPanchayatId);
        const parsedOrders = await parseExcelFile(
          file,
          selectedPanchayatId,
          p?.name,
          importBoardType,
          p?.boardPrices
        );
        if (parsedOrders.length === 0) {
          alert("No orders found in the Excel file. Please check column headers (Work Code, Work Name, etc.).");
        }

        const duplicates: string[] = [];
        const validNewOrders = (parsedOrders as Order[]).filter(newOrder => {
          // If no work code, always import (or handle as needed)
          if (!newOrder.workCode || newOrder.workCode.length < 3) return true;

          // Check for existing order with same Work Code
          // We normalize to lowercase for comparison
          const exists = orders.some(existing =>
            existing.workCode?.toLowerCase() === newOrder.workCode?.toLowerCase()
          );

          if (exists) {
            duplicates.push(`${newOrder.workCode} - ${newOrder.workName || 'Unknown Item'}`);
          }
          return !exists;
        });

        const skipped = duplicates.length;
        if (validNewOrders.length > 0) {
          setOrders(prev => [...prev, ...validNewOrders]);

          // Auto-Push to Cloud (Chunked)
          const uploadToCloud = async () => {
            try {
              // Chunk to avoid payload limits
              const chunkSize = 100;
              for (let i = 0; i < validNewOrders.length; i += chunkSize) {
                const chunk = validNewOrders.slice(i, i + chunkSize);
                const orderData = chunk.map(o => ({
                  id: o.id,
                  date: o.date,
                  work_code: o.workCode,
                  work_name: o.workName,
                  panchayat_id: o.panchayatId,
                  panchayat_name: o.panchayatName,
                  items: JSON.stringify(o.items),
                  amount: o.amount,
                  status: o.status,
                  is_placed: o.isPlaced,
                  payment_date: o.paymentDate,
                  verified_amount: o.verifiedAmount,
                  verified_date: o.verifiedDate,
                  is_verified: o.isVerified,
                  created_at: new Date().toISOString()
                }));
                const { error } = await supabase.from('orders').upsert(orderData);
                if (error) console.error("Cloud Auto-Upload Failed:", error);
              }
            } catch (err) {
              console.error("Cloud Auto-Upload Error:", err);
            }
          };
          uploadToCloud();
        }

        if (skipped > 0) {
          setDuplicateList(duplicates);
          setShowDuplicateModal(true);
        } else if (validNewOrders.length > 0) {
          alert(`Import Complete: ${validNewOrders.length} orders added successfully.`);
        }

        setShowUploadModal(false);
        setSelectedPanchayatId('');
      } catch (error: any) {
        console.error("Error parsing file:", error);
        alert(`Failed to parse Excel file: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const togglePaymentStatus = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const newStatus = order.status === 'Paid' ? 'Unpaid' : 'Paid';

    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

    // Auto-Push
    try {
      const { error } = await supabase.from('orders').update({
        status: newStatus
      }).eq('id', id);
      if (error) console.error("Cloud Status Update Failed:", error);
    } catch (err) {
      console.error("Cloud Status Update Error:", err);
    }
  };

  const togglePlacementStatus = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const newPlacement = !order.isPlaced;

    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, isPlaced: newPlacement } : o));

    // Auto-Push
    try {
      const { error } = await supabase.from('orders').update({
        is_placed: newPlacement
      }).eq('id', id);
      if (error) console.error("Cloud Placement Update Failed:", error);
    } catch (err) {
      console.error("Cloud Placement Update Error:", err);
    }
  };

  const saveCategory = async (name: string, subCategories: string[], isPanchayatLinked: boolean) => {
    const newCat: ExpenseCategory = {
      id: crypto.randomUUID(),
      name,
      subCategories,
      isPanchayatLinked
    };
    setCategories([...categories, newCat]);

    // Auto-Push to Cloud
    try {
      const { error } = await supabase.from('expense_categories').upsert({
        id: newCat.id,
        name: newCat.name,
        sub_categories: newCat.subCategories,
        is_panchayat_linked: newCat.isPanchayatLinked
      });
      if (error) console.error("Cloud Category Save Failed:", error);
    } catch (err) {
      console.error("Cloud Category Save Error:", err);
    }

    setShowCategoryModal(false);
  };

  const saveExpense = async (
    description: string,
    amount: number,
    date: string,
    categoryId: string,
    subCategory: string,
    panchayatId?: string
  ) => {
    const category = categories.find(c => c.id === categoryId);
    let expenseToSave: Expense;

    if (editingExpense) {
      // Update Existing
      expenseToSave = { ...editingExpense, description, amount, date, categoryId, categoryName: category ? category.name : 'Uncategorized', subCategory, panchayatId };
      setExpenses(prev => prev.map(e =>
        e.id === editingExpense.id
          ? expenseToSave
          : e
      ));
      setEditingExpense(null);
    } else {
      // Create New
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        date,
        description,
        amount,
        categoryId,
        categoryName: category ? category.name : 'Uncategorized',
        subCategory,
        panchayatId
      };
      expenseToSave = newExpense;
      setExpenses(prev => [...expenses, newExpense]);
    }

    // Auto-Push to Cloud
    try {
      const { error } = await supabase.from('expenses').upsert({
        id: expenseToSave.id,
        date: expenseToSave.date,
        description: expenseToSave.description,
        amount: expenseToSave.amount,
        category_id: expenseToSave.categoryId,
        category_name: expenseToSave.categoryName,
        sub_category: expenseToSave.subCategory,
        panchayat_id: expenseToSave.panchayatId
      });
      if (error) console.error("Cloud Auto-Save Failed:", error);
    } catch (err) {
      console.error("Cloud Auto-Save Error:", err);
    }

    setShowExpenseModal(false);
  };

  const [detailCategory, setDetailCategory] = useState<ExpenseCategory | null>(null);
  const [localStatusFilter, setLocalStatusFilter] = useState<PaymentStatus | 'Placed' | 'Remaining' | 'All'>('All');

  const getFilteredExpenses = () => {
    let filtered = expenses;
    // Apply Date Filter
    filtered = filtered.filter(e => isDateInRange(e.date, dateRange, customStartDate, customEndDate));
    return filtered;
  };

  const filteredExpenseList = getFilteredExpenses();
  const totalFilteredExpenses = filteredExpenseList.reduce((sum, e) => sum + e.amount, 0);

  const deleteOrder = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Use a small timeout to ensure UI updates before confirm dialog (fixes some mobile/browser quirks)
    setTimeout(() => {
      if (confirm('Are you sure you want to permanently delete this order?')) {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== id));

        // Auto-Delete from Cloud
        supabase.from('orders').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud Auto-Delete Failed:", error);
        });
      }
    }, 50);
  };

  const savePanchayat = async (name: string, person: string, phone: string, prices: BoardPrices, vendors: string[], district: string, block: string, nregaGP: string) => {
    let pToSave: Panchayat;
    if (editingPanchayat) {
      pToSave = { ...editingPanchayat, name, contactPerson: person, phone, boardPrices: prices, vendors, district, block, nregaGP };
      setPanchayats(prev => prev.map(p => p.id === editingPanchayat.id ? pToSave : p));
      setEditingPanchayat(null);
    } else {
      pToSave = {
        id: `panch-${crypto.randomUUID()}`,
        name,
        contactPerson: person,
        phone,
        boardPrices: prices,
        vendors,
        district,
        block,
        nregaGP,
        createdAt: new Date().toISOString()
      };
      setPanchayats(prev => [...prev, pToSave]);
    }

    // Auto-Push to Cloud
    try {
      const { error } = await supabase.from('panchayats').upsert({
        id: pToSave.id,
        name: pToSave.name,
        contact_person: pToSave.contactPerson,
        phone: pToSave.phone,
        district: pToSave.district,
        block: pToSave.block,
        nrega_gp: pToSave.nregaGP,
        board_prices: pToSave.boardPrices,
        vendors: pToSave.vendors,
      });
      if (error) console.error("Cloud Auto-Save Failed:", error);
    } catch (err) {
      console.error("Cloud Auto-Save Error:", err);
    }

    setShowPanchayatModal(false);
  };

  const handleReconcile = (text: string, panchayat: Panchayat) => {
    setIsReconciling(true);
    try {
      const rows = text.split('\n');
      let matchCount = 0;

      // Parse Rows into structured objects first
      // The table has a hierarchical structure where Vendor Name often appears only on the first row of a group
      const parsedRows: { workCode: string, vendor: string, paidAmount: number, paymentDate?: string }[] = [];
      let currentVendor = '';

      rows.forEach(row => {
        const cells = row.split('\t').map(c => c.trim());
        if (cells.length < 5) return; // Skip invalid rows

        // Column Index Mapping based on deep inspection (Row 5 example):
        // 0: "" (Padding?)
        // 1: S.No
        // 2: Vendor Regd No.(Vendor name)
        // 3: Work Code(Work Name)
        // ...
        // Last: Amount Paid

        const vendorCell = cells[2];
        // Update current vendor if cell is not empty
        if (vendorCell && vendorCell.length > 2) {
          // Extract name inside parentheses if possible, or use full string
          // Format: "RegNo(Name)"
          const match = vendorCell.match(/\((.*?)\)/);
          currentVendor = match ? match[1] : vendorCell;
        }

        const workCodeCell = cells[3];
        if (workCodeCell && currentVendor) {
          // Extract work code: "1610009005/IF/1112018(Work Name)" -> "1610009005/IF/1112018"
          const codeMatch = workCodeCell.match(/^([^\(]+)/);
          const cleanCode = codeMatch ? codeMatch[1].trim() : workCodeCell;

          // Extract target columns
          // Index 10: Amount (In Rupees) - Sanctioned Amount
          // Index 12: Date of Payment
          // Index 13 (Last): Amount Paid
          const amountCell = cells[10];
          const amountVal = parseFloat(amountCell);
          const dateCell = cells[12]; // Date of Payment

          if (cleanCode && !isNaN(amountVal)) {
            parsedRows.push({
              workCode: cleanCode,
              vendor: currentVendor,
              paidAmount: amountVal,
              paymentDate: dateCell
            });
          }
        }
      });

      const updatedOrders = orders.map(o => {
        if (o.panchayatId === panchayat.id && o.workCode) {
          // ABSOLUTE PROTECTION: If already Paid, NEVER change it via sync
          if (o.status === 'Paid') return o;

          const pVendors = (panchayat.vendors || []).map(v => v.toLowerCase().trim());
          const targetCode = o.workCode.toLowerCase().trim();

          // Find all matched rows
          const matches = parsedRows.filter(r => {
            const rowCode = r.workCode.toLowerCase();
            // Check Code Match
            if (!rowCode.includes(targetCode)) return false;

            // Check Vendor Match
            const rowVendor = r.vendor.toLowerCase();
            return pVendors.some(v => rowVendor.includes(v));
          });

          if (matches.length > 0) {
            const totalPaid = matches.reduce((sum, r) => sum + r.paidAmount, 0);
            // Get the latest payment date if found
            // Logic: If ANY match has a date, we mark as Paid.
            // We'll take the first non-empty date found.
            const paymentDate = matches.find(r => r.paymentDate && r.paymentDate.length > 5)?.paymentDate;

            matchCount++;
            return {
              ...o,
              isVerified: true,
              amount: totalPaid,
              verifiedAmount: totalPaid,
              verifiedDate: new Date().toISOString().split('T')[0],
              paymentDate: paymentDate,
              status: (paymentDate ? 'Paid' : 'Unpaid') as PaymentStatus
            };
          } else {
            // Logic: If we have a WorkCode BUT no match was found in the parsed NREGA rows
            // We mark this as "No Bill" to indicate it's missing from the portal
            return {
              ...o,
              status: 'No Bill' as PaymentStatus
            };
          }
        }
        return o;
      });

      if (matchCount > 0) {
        setOrders(updatedOrders);

        // Auto-Push to Cloud (Chunked)
        const pushReconciledToCloud = async () => {
          try {
            const changedOrders = updatedOrders.filter(o => o.panchayatId === panchayat.id && (o.isVerified || o.status === 'No Bill'));
            if (changedOrders.length === 0) return;

            const chunkSize = 100;
            for (let i = 0; i < changedOrders.length; i += chunkSize) {
              const chunk = changedOrders.slice(i, i + chunkSize);
              const orderData = chunk.map(o => ({
                id: o.id,
                date: o.date,
                work_code: o.workCode,
                work_name: o.workName,
                panchayat_id: o.panchayatId,
                panchayat_name: o.panchayatName,
                items: JSON.stringify(o.items),
                amount: o.amount,
                status: o.status,
                is_placed: o.isPlaced,
                payment_date: o.paymentDate,
                verified_amount: o.verifiedAmount,
                verified_date: o.verifiedDate,
                is_verified: o.isVerified,
                created_at: new Date().toISOString()
              }));
              const { error } = await supabase.from('orders').upsert(orderData);
              if (error) console.error("Cloud Reconcile Sync Failed:", error);
            }
          } catch (err) {
            console.error("Cloud Reconcile Sync Error:", err);
          }
        };
        pushReconciledToCloud();

        alert(`Successfully verified ${matchCount} projects!\nAmounts have been updated based on the NREGA portal data.`);
      } else {
        alert("No matching records found.");
      }
    } catch (e) {
      alert("Error parsing reconciliation data.");
      console.error(e);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleAutoFetch = async () => {
    if (!nregaUrl) return alert("Please configure a valid NREGA URL first.");
    setIsFetching(true);
    try {
      const p = selectedPanchayatDetails;
      if (!p) throw new Error("No Panchayat selected");

      // DIRECT LOCAL CALL (Bypassing Cloud Geo-Block)
      // Since you are in India, your Local Scraper can access NREGA.
      const res = await fetch('http://localhost:10000/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: nregaUrl,
          district: p.district,
          block: p.block,
          panchayat: p.nregaGP || p.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.data) {
        setPastedData(data.data);
        alert(`Successfully scraped data for ${p.nregaGP || p.name}!\nReview the text area and click 'Sync Distribution' to confirm.`);
      }
    } catch (error: any) {
      alert(`Auto-Fetch Failed: ${error.message}\nMake sure District/Block names match NREGA portal exactly.`);
    } finally {
      setIsFetching(false);
    }
  };

  // MASTER SYNC KEY
  const [isMasterSyncing, setIsMasterSyncing] = useState(false);
  const handleMasterSync = async () => {
    if (!nregaUrl) return alert("Please configure a valid Global NREGA URL first.");
    if (!confirm(`Are you sure you want to Auto-Fetch and Sync ALL ${panchayats.length} Panchayats?\n\nThis process may take a few minutes.`)) return;

    setIsMasterSyncing(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    let masterOrders = [...orders]; // Work on a copy of orders

    try {
      // Loop through all panchayats sequentially to manage load
      for (const p of panchayats) {
        try {
          // 1. Fetch Data
          // DIRECT LOCAL CALL (Bypassing Cloud Geo-Block)
          const res = await fetch('http://localhost:10000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: nregaUrl,
              district: p.district,
              block: p.block,
              panchayat: p.nregaGP || p.name
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Fetch failed');

          if (data.data) {
            // 2. Reconcile Logic (Inline Version of handleReconcile)
            const rows = data.data.split('\n');
            const parsedRows: { workCode: string, vendor: string, paidAmount: number, paymentDate?: string }[] = [];
            let currentVendor = '';

            rows.forEach((row: string) => {
              const cells = row.split('\t').map((c: string) => c.trim());
              if (cells.length < 5) return;
              const vendorCell = cells[2];
              if (vendorCell && vendorCell.length > 2) {
                const match = vendorCell.match(/\((.*?)\)/);
                currentVendor = match ? match[1] : vendorCell;
              }
              const workCodeCell = cells[3];
              if (workCodeCell && currentVendor) {
                const codeMatch = workCodeCell.match(/^([^\(]+)/);
                const cleanCode = codeMatch ? codeMatch[1].trim() : workCodeCell;
                const amountVal = parseFloat(cells[10]);
                const dateCell = cells[12];
                if (cleanCode && !isNaN(amountVal)) {
                  parsedRows.push({
                    workCode: cleanCode,
                    vendor: currentVendor,
                    paidAmount: amountVal,
                    paymentDate: dateCell
                  });
                }
              }
            });

            // Update masterOrders for this panchayat
            masterOrders = masterOrders.map(o => {
              if (o.panchayatId === p.id && o.workCode) {
                // ABSOLUTE PROTECTION: If already Paid, NEVER change it via sync
                if (o.status === 'Paid') return o;

                const pVendors = (p.vendors || []).map(v => v.toLowerCase().trim());
                const targetCode = o.workCode.toLowerCase().trim();
                const matches = parsedRows.filter(r => {
                  if (!r.workCode.toLowerCase().includes(targetCode)) return false;
                  const rowVendor = r.vendor.toLowerCase();
                  return pVendors.some(v => rowVendor.includes(v));
                });

                if (matches.length > 0) {
                  const totalPaid = matches.reduce((sum, r) => sum + r.paidAmount, 0);
                  const paymentDate = matches.find(r => r.paymentDate && r.paymentDate.length > 5)?.paymentDate;
                  const newStatus = (paymentDate ? 'Paid' : 'Unpaid') as PaymentStatus;
                  return {
                    ...o,
                    isVerified: true,
                    amount: totalPaid,
                    verifiedAmount: totalPaid,
                    verifiedDate: new Date().toISOString().split('T')[0],
                    paymentDate: paymentDate,
                    status: newStatus
                  };
                } else {
                  // No match found in this scrape = No Bill
                  return { ...o, status: 'No Bill' as PaymentStatus };
                }
              }
              return o;
            });
            successCount++;
          }
        } catch (err: any) {
          console.error(`Sync Failed for ${p.name}:`, err);
          failCount++;
          errors.push(`${p.name}: ${err.message}`);
        }
      }

      // 3. Final Commit
      setOrders(masterOrders);

      // Auto-Push to Cloud (Chunked)
      const pushSyncToCloud = async () => {
        try {
          const changedOrders = masterOrders.filter(o => o.isVerified || o.status === 'No Bill');
          if (changedOrders.length === 0) return;

          const chunkSize = 100;
          for (let i = 0; i < changedOrders.length; i += chunkSize) {
            const chunk = changedOrders.slice(i, i + chunkSize);
            const orderData = chunk.map(o => ({
              id: o.id,
              date: o.date,
              work_code: o.workCode,
              work_name: o.workName,
              panchayat_id: o.panchayatId,
              panchayat_name: o.panchayatName,
              items: JSON.stringify(o.items),
              amount: o.amount,
              status: o.status,
              is_placed: o.isPlaced,
              payment_date: o.paymentDate,
              verified_amount: o.verifiedAmount,
              verified_date: o.verifiedDate,
              is_verified: o.isVerified,
              created_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('orders').upsert(orderData);
            if (error) console.error("Cloud Master Sync Failed:", error);
          }
        } catch (err) {
          console.error("Cloud Master Sync Error:", err);
        }
      };
      pushSyncToCloud();

      alert(`Master Sync Complete!\n\nSuccess: ${successCount}\nFailed: ${failCount}\n\n${errors.length > 0 ? "Errors:\n" + errors.join('\n') : ""}`);

    } catch (e: any) {
      alert("Critical Error during Master Sync: " + e.message);
    } finally {
      setIsMasterSyncing(false);
    }
  };

  // HYBRID SYNC: Push Local Data to Cloud
  const handleCloudPush = async () => {
    if (!confirm("Confirm Cloud Sync?\n\nThis will UPLOAD all your local data (Orders, Panchayats, Expenses) to the Cloud Database.\n\nUse this after Auto-Fetching to update the website.")) return;

    setIsCloudSyncing(true);
    try {
      // 1. Sync Panchayats
      const panchayatData = panchayats.map(p => ({
        id: p.id,
        name: p.name,
        contact_person: p.contactPerson,
        phone: p.phone,
        district: p.district,
        block: p.block,
        nrega_gp: p.nregaGP,
        board_prices: p.boardPrices,
        vendors: p.vendors,
      }));

      const { error: pError } = await supabase.from('panchayats').upsert(panchayatData);
      if (pError) throw new Error("Panchayat Sync Failed: " + pError.message);

      // 2. Sync Expense Categories
      const categoryData = categories.map(c => ({
        id: c.id,
        name: c.name,
        sub_categories: c.subCategories,
        is_panchayat_linked: c.isPanchayatLinked
      }));
      if (categoryData.length > 0) {
        const { error: cError } = await supabase.from('expense_categories').upsert(categoryData);
        if (cError) throw new Error("Category Sync Failed: " + cError.message);
      }

      // 3. Sync Orders
      // Batch in chunks of 100 to avoid payload limits
      const orderChunks = [];
      const chunkSize = 100;
      for (let i = 0; i < orders.length; i += chunkSize) {
        orderChunks.push(orders.slice(i, i + chunkSize));
      }

      for (const chunk of orderChunks) {
        const orderData = chunk.map(o => ({
          id: o.id,
          date: o.date,
          work_code: o.workCode,
          work_name: o.workName,
          panchayat_id: o.panchayatId,
          panchayat_name: o.panchayatName,
          items: JSON.stringify(o.items), // Store as text/json
          amount: o.amount,
          status: o.status,
          is_placed: o.isPlaced,
          payment_date: o.paymentDate,
          verified_amount: o.verifiedAmount,
          verified_date: o.verifiedDate,
          is_verified: o.isVerified,
          created_at: new Date().toISOString()
        }));
        const { error: oError } = await supabase.from('orders').upsert(orderData);
        if (oError) throw new Error("Order Sync Failed: " + oError.message);
      }

      // 4. Sync Expenses
      const expenseData = expenses.map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: e.amount,
        category_id: e.categoryId,
        category_name: e.categoryName,
        sub_category: e.subCategory,
        panchayat_id: e.panchayatId
      }));

      if (expenseData.length > 0) {
        const { error: eError } = await supabase.from('expenses').upsert(expenseData);
        if (eError) throw new Error("Expense Sync Failed: " + eError.message);
      }

      alert("✅ Cloud Sync Complete!\n\nYour Local Data is now live on the Cloud App.");

    } catch (error: any) {
      alert(`Sync Failed: ${error.message}`);
      console.error(error);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // LOCAL BACKUP EXPORT (Enhanced with File Picker)
  const handleExportBackup = async () => {
    // 1. Prepare Data
    const backupData = {
      meta: {
        version: "2.0",
        date: new Date().toISOString(),
        type: "Aone_Full_Backup"
      },
      orders,
      expenses,
      incomes,
      panchayats,
      categories
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `Aone_Backup_${new Date().toISOString().split('T')[0]}.json`;

    try {
      // 2. Try Modern "Save As" Picker (Supported in Chrome/Edge desktops)
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Aone Board Backup File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        alert("✅ Backup Saved Successfully!");
        return;
      }
    } catch (err: any) {
      // User cancelled picker or error
      if (err.name === 'AbortError') return;
      console.warn("File System Access API failed, falling back to download link.", err);
    }

    // 3. Fallback: Standard Download Link
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // We can't guarantee where it went in fallback mode, but usually Downloads
      alert("✅ Backup Downloaded!\n(Check your Downloads folder if you didn't see a prompt)");
    } catch (e: any) {
      alert("Backup Failed: " + e.message);
    }
  };

  // LOCAL BACKUP RESTORE
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ WARNING: RESTORE DATA?\n\nThis will REPLACE all your current current data with the data from this backup file.\n\nAre you sure you want to proceed?")) {
      e.target.value = ''; // Reset input
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.meta || data.meta.type !== 'Aone_Full_Backup') {
        throw new Error("Invalid Backup File. Please select a valid 'Aone_Backup.json' file.");
      }

      // Restore State
      if (data.orders) setOrders(data.orders);
      if (data.expenses) setExpenses(data.expenses);
      if (data.incomes) setIncomes(data.incomes);
      if (data.panchayats) setPanchayats(data.panchayats);
      if (data.categories) setCategories(data.categories);

      alert(`✅ Restore Complete!\n\nRestored:\n- ${data.orders?.length || 0} Orders\n- ${data.expenses?.length || 0} Expenses\n- ${data.panchayats?.length || 0} Panchayats`);

    } catch (err: any) {
      alert("Restore Failed: " + err.message);
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const deletePanchayat = (id: string) => {
    setTimeout(() => {
      if (confirm('Delete this Panchayat? All associated orders will remain but will be unlinked.')) {
        setPanchayats(prev => prev.filter(p => p.id !== id));

        // Auto-Delete from Cloud
        supabase.from('panchayats').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud Auto-Delete Failed:", error);
        });
      }
    }, 50);
  };

  const deleteExpense = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setTimeout(() => {
      if (confirm('Permanently delete this expense?')) {
        setExpenses(prev => prev.filter(exp => exp.id !== id));

        // Auto-Delete from Cloud
        supabase.from('expenses').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud Auto-Delete Failed:", error);
        });
      }
    }, 50);
  };

  // Filtered Data
  const filteredByDateOrders = useMemo(() => {
    if (dateRange === 'all-time') return orders;
    return orders.filter(o => isDateInRange(o.date, dateRange, customStartDate, customEndDate));
  }, [orders, dateRange, customStartDate, customEndDate]);

  const filteredByDateExpenses = useMemo(() => {
    if (dateRange === 'all-time') return expenses;
    return expenses.filter(e => isDateInRange(e.date, dateRange, customStartDate, customEndDate));
  }, [expenses, dateRange, customStartDate, customEndDate]);

  const filteredOrders = useMemo(() => {
    return filteredByDateOrders.filter(order => {
      const name = order.panchayatName || (order as any).panchayat || 'Unknown';
      const items = order.items || 'Unknown';
      const workCode = order.workCode || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        items.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'All' || order.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [filteredByDateOrders, searchQuery, filterStatus]);

  // Dashboard Stats
  const totalRevenue = filteredByDateOrders.filter(o => o.status === 'Paid').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const pendingPayments = filteredByDateOrders.filter(o => o.status === 'Unpaid').reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalExpenses = filteredByDateExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalVolume = filteredByDateOrders.length;
  const totalUnbilled = filteredByDateOrders.filter(o => o.status === 'No Bill').length;
  const totalDelivered = filteredByDateOrders.filter(o => o.isPlaced).length;
  const totalNotDelivered = filteredByDateOrders.filter(o => !o.isPlaced).length;

  // Panchayat Analytics
  const panchayatStats = useMemo(() => {
    return panchayats.map(p => {
      const pOrders = orders.filter(o => o.panchayatId === p.id);
      const total = pOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

      const paidOrders = pOrders.filter(o => o.status === 'Paid');
      const paid = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

      const unpaidOrders = pOrders.filter(o => o.status === 'Unpaid');
      const unpaid = unpaidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

      const noBillOrders = pOrders.filter(o => o.status === 'No Bill');
      const noBill = noBillOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

      const placed = pOrders.filter(o => o.isPlaced === true).length;
      return {
        ...p,
        orderCount: pOrders.length,
        placedCount: placed,
        remainingCount: pOrders.length - placed,
        totalAmount: total,
        paidAmount: paid,
        paidCount: paidOrders.length,
        unpaidAmount: unpaid,
        unpaidCount: unpaidOrders.length,
        noBillAmount: noBill,
        noBillCount: noBillOrders.length,
        balance: total - paid,
        // New: Total Expenses
        totalExpenses: expenses
          .filter(e => e.panchayatId === p.id)
          .reduce((sum, e) => sum + e.amount, 0),
        // New: Profit
        profit: paid - (expenses
          .filter(e => e.panchayatId === p.id)
          .reduce((sum, e) => sum + e.amount, 0))
      };
    });
  }, [panchayats, orders, expenses]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 z-40 hidden lg:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <Package size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 font-display">Aone</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Board Tracker</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'panchayats', label: 'Panchayats', icon: Building2 },
              { id: 'orders', label: 'Order History', icon: History },
              { id: 'expenses', label: 'Expenses', icon: CreditCard },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSelectedPanchayatDetails(null); setLocalStatusFilter('All'); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/80 hover:translate-x-1'
                  }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />
                {item.label}
              </button>
            ))}
            {isAdmin && (
              <>
                <button
                  key="admin"
                  onClick={() => { setActiveTab('admin'); setSelectedPanchayatDetails(null); }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${activeTab === 'admin'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/80 hover:translate-x-1'
                    }`}
                >
                  <Shield size={20} className={activeTab === 'admin' ? 'text-white' : 'text-slate-400 group-hover:text-rose-500 transition-colors'} />
                  Admin Console
                </button>
                <button
                  onClick={() => { setIsAdmin(false); setActiveTab('dashboard'); }}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/80 hover:translate-x-1"
                >
                  <User size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                  Sign Out
                </button>
              </>
            )}

            {!isAdmin && (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/80 hover:translate-x-1 mt-auto"
              >
                <Lock size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                Admin Access
              </button>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6 md:p-10 min-h-screen relative">
        {/* Background blobs */}
        <div className="fixed top-[-10%] left-[10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />
        <div className="fixed bottom-[-5%] right-[5%] w-[300px] h-[300px] bg-violet-500/10 blur-[100px] rounded-full -z-10" />

        {/* Header (Dynamic) */}
        {!selectedPanchayatDetails && (
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12 animate-fade-in">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest">Aone Enterprise</span>
                <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-widest">Local Mode</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight capitalize font-display italic">{activeTab}</h2>
            </div>

            <div className="flex gap-4">


              {/* BACKUP BUTTON */}
              <button
                onClick={handleExportBackup}
                className="group relative px-4 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
                title="Download Backup (Save to Drive)"
              >
                <div className="text-emerald-600">
                  <Shield size={18} strokeWidth={2.5} />
                </div>
              </button>

              {/* RESTORE BUTTON */}
              <div className="relative">
                <input
                  type="file"
                  id="restore-backup-input"
                  className="hidden"
                  accept=".json"
                  onChange={handleRestoreBackup}
                />
                <button
                  onClick={() => document.getElementById('restore-backup-input')?.click()}
                  className="group relative px-4 py-4 bg-amber-500/10 hover:bg-amber-500/20 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-95"
                  title="Restore from Backup"
                >
                  <div className="text-amber-600">
                    <History size={18} strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-3 glass px-5 py-3 rounded-2xl border-white/40 shadow-sm">
                <Calendar size={18} className="text-indigo-500" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer text-slate-600 dark:text-slate-300"
                >
                  <option value="all-time">All Time</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="this-year">This Year</option>
                  <option value="ytd">Year to Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 glass px-4 py-2 rounded-2xl border-white/40 shadow-sm animate-fade-in">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-transparent text-[10px] font-black outline-none cursor-pointer text-slate-600 dark:text-slate-300 uppercase"
                  />
                  <span className="text-[10px] font-black text-slate-400">TO</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-transparent text-[10px] font-black outline-none cursor-pointer text-slate-600 dark:text-slate-300 uppercase"
                  />
                </div>
              )}

              <button
                onClick={handleMasterSync}
                disabled={isMasterSyncing || !nregaUrl}
                className={`flex items-center gap-2 gradient-bg hover:opacity-90 text-white px-7 py-4 rounded-2xl cursor-pointer transition-all duration-300 font-black shadow-xl shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest ${isMasterSyncing ? 'animate-pulse opacity-80' : ''}`}
                title="Auto-Fetch & Sync ALL Panchayats"
              >
                <div className={`p-1 bg-white/20 rounded-full ${isMasterSyncing ? 'animate-spin' : ''}`}>
                  <RefreshCw size={14} className="text-white" />
                </div>
                {isMasterSyncing ? 'Syncing...' : 'Master Key'}
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 gradient-bg hover:opacity-90 text-white px-7 py-4 rounded-2xl cursor-pointer transition-all duration-300 font-black shadow-xl shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest"
              >
                <Upload size={18} />
                Import Orders
              </button>
            </div>
          </header>
        )}

        {/* Panchayat Detail View */}
        {selectedPanchayatDetails ? (
          <div className="animate-fade-in">
            <button
              onClick={() => { setSelectedPanchayatDetails(null); setLocalStatusFilter('All'); }}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 font-bold mb-8 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-1 space-y-6">
                <div className="glass p-10 rounded-[40px] border relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-indigo-500/10">
                    <Building2 size={120} />
                  </div>
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center mb-6">
                    <Building2 size={32} />
                  </div>
                  <h3 className="text-3xl font-black font-display italic leading-none">{selectedPanchayatDetails.name}</h3>
                  <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">{selectedPanchayatDetails.contactPerson || 'N/A'}</p>

                  <div className="mt-10 space-y-3">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Pricing</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded text-[10px] font-bold">₹{selectedPanchayatDetails.boardPrices.type1}</span>
                        <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded text-[10px] font-bold">₹{selectedPanchayatDetails.boardPrices.type2}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Linked Vendors</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedPanchayatDetails.vendors?.length > 0 ? (
                          selectedPanchayatDetails.vendors.map((v, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-500/5 text-indigo-500 rounded-lg text-[9px] font-bold border border-indigo-500/10 italic">{v}</span>
                          ))
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 italic">No vendors configured</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => { setSelectedPanchayatId(selectedPanchayatDetails.id); setShowUploadModal(true); }}
                      className="w-full flex items-center justify-center gap-3 py-5 gradient-bg text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Upload size={18} />
                      Upload Project Sheet
                    </button>
                  </div>
                </div>

                <div className="glass p-10 rounded-[40px] border">
                  <h4 className="text-lg font-black font-display uppercase tracking-widest text-slate-400 mb-8 italic text-center">NREGA Sync Tool</h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Status Identifier</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-all">{selectedPanchayatDetails.nregaGP || selectedPanchayatDetails.name}</p>
                      </div>
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 italic">Verify Expenditure</label>
                        <button
                          onClick={() => setShowUrlConfig(!showUrlConfig)}
                          className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1"
                        >
                          <Settings size={10} />
                          {showUrlConfig ? 'Hide Config' : 'Configure URL'}
                        </button>
                      </div>

                      {showUrlConfig && (
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 animate-fade-in mb-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Portal URL</label>
                          <input
                            type="text"
                            value={nregaUrl}
                            onChange={(e) => setNregaUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 outline-none text-[10px] font-mono text-slate-600 dark:text-slate-300"
                          />
                        </div>
                      )}

                      <textarea
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        placeholder="Copy-paste table rows from NREGA portal here..."
                        className="w-full h-32 p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 outline-none text-[10px] font-mono leading-relaxed"
                      />
                      <button
                        onClick={() => handleReconcile(pastedData, selectedPanchayatDetails)}
                        disabled={!pastedData || isReconciling}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-50 hover:bg-indigo-700 transition-all font-display"
                      >
                        {isReconciling ? 'Checking Portal Data...' : 'Sync Distribution'}
                      </button>

                      <button
                        onClick={handleAutoFetch}
                        disabled={isFetching || !nregaUrl}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 hover:bg-emerald-700 transition-all font-display flex items-center justify-center gap-2"
                      >
                        {isFetching ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <ExternalLink size={14} />
                            Auto-Fetch from NREGA
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              <div className="glass p-10 rounded-[40px] border">
                <h4 className="text-lg font-black font-display uppercase tracking-widest text-slate-400 mb-8 italic text-center">Project Expenses</h4>

                {(() => {
                  const pExpenses = expenses
                    .filter(e => e.panchayatId === selectedPanchayatDetails.id)
                    .filter(e => isDateInRange(e.date, dateRange, customStartDate, customEndDate));


                  // In-Page Filter Logic (Calculated from top-level state)
                  const displayedExpenses = localCatFilter
                    ? pExpenses.filter(e => e.categoryId === localCatFilter)
                    : pExpenses;

                  const totalPExpense = pExpenses.reduce((sum, e) => sum + e.amount, 0);

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Overhead</p>
                          <p className="text-2xl font-black italic mt-1 font-display">{formatCurrency(totalPExpense)}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
                          <Wallet size={20} />
                        </div>
                      </div>

                      {/* PANCHAYAT CATEGORY BREAKDOWN */}
                      <div className="grid grid-cols-2 gap-3">
                        {categories.map(cat => {
                          const pCatTotal = pExpenses
                            .filter(e => e.categoryId === cat.id)
                            .reduce((sum, e) => sum + e.amount, 0);
                          if (pCatTotal === 0) return null;
                          return (
                            <div
                              key={cat.id}
                              onClick={() => setLocalCatFilter(localCatFilter === cat.id ? null : cat.id)}
                              className={`p-3 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden ${localCatFilter === cat.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg scale-105' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100'}`}
                            >
                              <p className={`text-[8px] font-black uppercase tracking-widest truncate ${localCatFilter === cat.id ? 'text-indigo-100' : 'text-slate-400'}`}>{cat.name}</p>
                              <p className={`text-lg font-black italic mt-0.5 font-display ${localCatFilter === cat.id ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{formatCurrency(pCatTotal)}</p>
                              {localCatFilter === cat.id && <div className="absolute top-2 right-2"><CheckCircle2 size={12} className="text-white" /></div>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {displayedExpenses.length > 0 ? displayedExpenses.map(e => (
                          <div key={e.id} className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded text-[9px] font-black uppercase tracking-widest">{e.categoryName}</span>
                              <span className="text-[10px] font-bold text-slate-400">{e.date}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{e.description}</p>
                            <p className="text-sm font-black italic mt-1 font-display text-right">{formatCurrency(e.amount)}</p>
                          </div>
                        )) : (
                          <div className="text-center py-8">
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">No linked expenses found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(() => {
                    const s = panchayatStats.find(ps => ps.id === selectedPanchayatDetails.id);
                    return (
                      <>
                        <button
                          onClick={() => setLocalStatusFilter(localStatusFilter === 'Placed' ? 'All' : 'Placed')}
                          className={`group glass p-8 rounded-[32px] border relative overflow-hidden text-left transition-all active:scale-95 ${localStatusFilter === 'Placed' ? 'ring-2 ring-emerald-500 shadow-xl bg-emerald-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          <div className={`absolute right-6 top-6 p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl group-hover:scale-110 transition-transform shadow-sm ${localStatusFilter === 'Placed' ? 'bg-emerald-500 text-white' : ''}`}>
                            <Check size={28} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placed / Completed</p>
                          <p className="text-5xl font-black italic mt-2 font-display">{s?.placedCount || 0}</p>
                          {localStatusFilter === 'Placed' && <div className="absolute bottom-4 right-6 text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-fade-in">Active Filter</div>}
                        </button>

                        <button
                          onClick={() => setLocalStatusFilter(localStatusFilter === 'Remaining' ? 'All' : 'Remaining')}
                          className={`group glass p-8 rounded-[32px] border relative overflow-hidden text-left transition-all active:scale-95 ${localStatusFilter === 'Remaining' ? 'ring-2 ring-amber-500 shadow-xl bg-amber-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          <div className={`absolute right-6 top-6 p-4 bg-amber-500/10 text-amber-500 rounded-3xl group-hover:scale-110 transition-transform shadow-sm ${localStatusFilter === 'Remaining' ? 'bg-amber-500 text-white' : ''}`}>
                            <Clock size={28} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remaining / Queue</p>
                          <p className="text-5xl font-black italic mt-2 text-amber-500 font-display">{s?.remainingCount || 0}</p>
                          {localStatusFilter === 'Remaining' && <div className="absolute bottom-4 right-6 text-[9px] font-black text-amber-500 uppercase tracking-widest animate-fade-in">Active Filter</div>}
                        </button>
                      </>
                    );
                  })()}

                </div>

                {/* Financial Status Filters */}
                {(() => {
                  const s = panchayatStats.find(ps => ps.id === selectedPanchayatDetails.id);
                  const statusFilters = [
                    { id: 'Paid', label: 'Paid Orders', count: s?.paidCount || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { id: 'Unpaid', label: 'Pending Payment', count: s?.unpaidCount || 0, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { id: 'No Bill', label: 'No Bill / Missing', count: s?.noBillCount || 0, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
                  ];
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {statusFilters.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setLocalStatusFilter(localStatusFilter === f.id ? 'All' : f.id as any)}
                          className={`p-6 rounded-[24px] border text-left transition-all active:scale-95 group relative overflow-hidden ${localStatusFilter === f.id
                            ? `ring-2 ring-indigo-500 shadow-xl ${f.bg}`
                            : 'glass hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                        >
                          <div className={`w-10 h-10 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <Filter size={18} />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</p>
                          <p className={`text-2xl font-black italic mt-1 font-display ${f.color}`}>{f.count}</p>

                          {localStatusFilter === f.id && (
                            <div className="absolute top-4 right-4 text-indigo-500 animate-fade-in">
                              <CheckCircle2 size={18} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="glass rounded-[40px] border shadow-2xl overflow-hidden min-h-[500px]">
                <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h4 className="text-2xl font-black font-display italic">Project Ledger</h4>
                    {localStatusFilter !== 'All' && (
                      <span className="px-3 py-1 bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-fade-in flex items-center gap-2">
                        Filtered: {localStatusFilter}
                        <button onClick={() => setLocalStatusFilter('All')} className="hover:text-indigo-200"><X size={12} /></button>
                      </span>
                    )}
                  </div>
                  <LayoutList className="text-slate-300" size={24} />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-10 py-6">Work Details</th>
                        <th className="px-10 py-6 text-center">Unit Calculation</th>
                        <th className="px-10 py-6 text-center">Payment Date</th>
                        <th className="px-10 py-6 text-center">Flow</th>
                        <th className="px-10 py-6 text-right">Net Value</th>
                        {isAdmin && <th className="px-10 py-6 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                      {orders
                        .filter(o => o.panchayatId === selectedPanchayatDetails.id)
                        .filter(o => {
                          if (localStatusFilter === 'All') return true;
                          if (localStatusFilter === 'Placed') return o.isPlaced === true;
                          if (localStatusFilter === 'Remaining') return !o.isPlaced;
                          return o.status === localStatusFilter;
                        })
                        .map((o) => (
                          <tr key={o.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-10 py-7">
                              <div className="flex flex-col">
                                <div className="relative group/code w-fit">
                                  <span className="text-sm font-black font-mono text-indigo-500 uppercase mb-1 cursor-help underline decoration-dotted decoration-indigo-300">{o.workCode || 'UNCATEGORIZED'}</span>
                                  {/* Hover Popup */}
                                  <div className="absolute left-0 bottom-full mb-2 w-max max-w-[250px] p-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl shadow-xl opacity-0 group-hover/code:opacity-100 transition-opacity pointer-events-none z-50 invisible group-hover/code:visible">
                                    {o.workName || o.items}
                                    <div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-slate-900 rotate-45" />
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors uppercase italic leading-tight">
                                  {(() => {
                                    const codeLen = (o.workCode || 'UNCATEGORIZED').length;
                                    const name = o.workName || o.items || '';
                                    return name.length > codeLen ? name.substring(0, codeLen) + '...' : name;
                                  })()}
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-mono text-slate-400">{o.date}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase">Board {(o.boardType || 'type1').replace('type', ' #')}</span>
                                  {o.isVerified && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase ml-2 animate-pulse">
                                      <CheckCircle2 size={10} />
                                      Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-7 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-xl font-black italic">{o.quantity || 1}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">@ ₹{o.rate}</span>
                              </div>
                            </td>
                            <td className="px-10 py-7 text-center">
                              <span className={`text-[11px] font-black uppercase tracking-widest ${o.paymentDate ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                                {o.paymentDate || '-'}
                              </span>
                            </td>
                            <td className="px-10 py-7 text-center">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => togglePlacementStatus(o.id)}
                                  className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${o.isPlaced ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                    } hover:scale-105 active:scale-95 cursor-pointer`}
                                  title="Toggle Placement"
                                >
                                  {o.isPlaced ? 'Placed' : 'Remaining'}
                                </button>
                                <button
                                  onClick={() => isAdmin && togglePaymentStatus(o.id)}
                                  className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${o.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed animate-none' : 'hover:scale-105 active:scale-95'}`}
                                  title={!isAdmin ? "Admin Access Required" : "Toggle Payment"}
                                >
                                  {o.status}
                                </button>
                              </div>
                            </td>
                            <td className="px-10 py-7 text-right">
                              <span className="text-2xl font-black italic text-slate-900 dark:text-white font-display">{formatCurrency(o.amount)}</span>
                            </td>
                            {isAdmin && (
                              <td className="px-10 py-7 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setEditingOrder(o)}
                                    className="p-2 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors"
                                    title="Edit Order"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => deleteOrder(o.id, e)}
                                    className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up space-y-10">
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {[
                    { label: 'Revenue Generated', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Unpaid Ledger', value: formatCurrency(pendingPayments), icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Business Cost', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { label: 'Order Volume', value: totalVolume, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Unbilled Orders', value: totalUnbilled, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-600/10' },
                    { label: 'Delivered Boards', value: totalDelivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
                    { label: 'Unbilled Orders', value: totalUnbilled, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-600/10' },
                    { label: 'Delivered Boards', value: totalDelivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
                    { label: 'Pending Delivery', value: totalNotDelivered, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-600/10' },
                    { label: 'Net Profit', value: formatCurrency(totalRevenue - totalExpenses), icon: Wallet, color: (totalRevenue - totalExpenses) >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: (totalRevenue - totalExpenses) >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
                  ].map((stat, i) => (
                    <div key={i} className="glass p-8 rounded-[35px] border group overflow-hidden relative transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                      <div className={`absolute -right-6 -top-6 w-28 h-28 ${stat.bg} rounded-full blur-[40px] opacity-40 group-hover:scale-150 transition-transform duration-700`} />
                      <div className="flex items-start justify-between mb-10 relative">
                        <div className={`p-5 rounded-3xl ${stat.bg} ${stat.color} shadow-sm group-hover:rotate-6 transition-transform`}>
                          <stat.icon size={30} />
                        </div>
                        <div className="w-10 h-1 grad-bg rounded-full opacity-20" />
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                      <p className="text-4xl font-black mt-2 tracking-tighter italic">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 glass rounded-[45px] shadow-2xl overflow-hidden border">
                    <div className="p-10 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                      <h3 className="text-2xl font-black font-display italic">Recent Board Projects</h3>
                      <div className="p-3 bg-indigo-500/5 rounded-2xl text-indigo-500">
                        <Layers size={22} />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                            <th className="px-10 py-7">Identification</th>
                            <th className="px-10 py-7 text-center">Batch Status</th>
                            <th className="px-10 py-7 text-right">Net Valuation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5 font-sans">
                          {filteredByDateOrders.slice(0, 5).map((o) => (
                            <tr key={o.id} className="group hover:bg-indigo-50/40 dark:hover:bg-white/5 transition-all">
                              <td className="px-10 py-7">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-indigo-500/60 mb-1 tracking-tighter uppercase">{o.workCode || 'SYSTEM-GEN'}</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors uppercase italic truncate max-w-xs">{o.panchayatName}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{o.quantity || 1} Units</span>
                                    <span className="text-[9px] font-mono text-slate-300">×</span>
                                    <span className="text-[9px] font-black text-slate-500 italic truncate">{o.workName || o.items}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-7 text-center">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${o.isPlaced ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {o.isPlaced ? 'Delivered' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-10 py-7 text-right">
                                <span className="text-2xl font-black text-slate-900 dark:text-white italic font-display">{formatCurrency(o.amount)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass p-10 rounded-[45px] grad-bg text-white shadow-3xl relative overflow-hidden group">
                      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/20 blur-[50px] rounded-full group-hover:scale-125 transition-transform duration-700" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Distribution Score</span>
                      <h4 className="text-6xl font-black italic tracking-tighter mt-4">92%</h4>
                      <div className="w-full bg-white/10 h-1.5 rounded-full mt-8 overflow-hidden">
                        <div className="bg-white h-full rounded-full" style={{ width: '92%' }} />
                      </div>
                      <p className="text-xs font-bold mt-6 leading-relaxed opacity-80">Efficiency in board placement has increased by 12% this month.</p>
                    </div>

                    <div className="glass p-10 rounded-[45px] border shadow-xl flex flex-col items-center text-center group">
                      <div className="w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-all duration-500">
                        <User size={42} className="text-indigo-500" />
                      </div>
                      <h4 className="text-2xl font-black font-display italic">Aone Global</h4>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 px-6">Enterprise Control Center</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'panchayats' && (
              <div className="space-y-10 animate-slide-up">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="relative flex-1 w-full max-w-xl">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input
                      type="text"
                      placeholder="Search Registry..."
                      className="w-full pl-18 pr-8 py-5 rounded-3xl border bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl outline-none font-bold text-lg shadow-inner focus:ring-4 focus:ring-indigo-500/5"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => { setEditingPanchayat(null); setShowPanchayatModal(true); }}
                      className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={20} strokeWidth={4} />
                      Add Entity
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {panchayatStats
                    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((p) => (
                      <div key={p.id} className="glass p-10 rounded-[50px] border shadow-lg glass-hover group relative overflow-hidden cursor-pointer active:scale-95 transition-all" onClick={() => setSelectedPanchayatDetails(p)}>
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-20 h-20 rounded-[28px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm">
                            <Building2 size={38} />
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setEditingPanchayat(p); setShowPanchayatModal(true); }} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border hover:bg-indigo-500 hover:text-white transition-all shadow-md">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deletePanchayat(p.id); }} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border hover:bg-rose-500 hover:text-white transition-all text-rose-500 shadow-md">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                        <h4 className="text-3xl font-black font-display italic tracking-tight mb-1">{p.name}</h4>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">{p.contactPerson || 'SYSTEM UNIT'}</span>

                        <div className="mt-10 py-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-2 text-center">
                            <div>
                              <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter mb-1">Paid ({p.paidCount})</p>
                              <p className="text-sm font-black italic">{formatCurrency(p.paidAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-amber-500 tracking-tighter mb-1">Unpaid ({p.unpaidCount})</p>
                              <p className="text-sm font-black italic">{formatCurrency(p.unpaidAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-rose-500 tracking-tighter mb-1">No Bill ({p.noBillCount})</p>
                              <p className="text-sm font-black italic">{formatCurrency(p.noBillAmount)}</p>
                            </div>
                            <div className="col-span-1 md:col-span-1 border-t border-slate-100 dark:border-white/5 pt-4 md:border-t-0 md:pt-0">
                              <p className="text-[9px] font-black uppercase text-indigo-500 tracking-tighter mb-1">Expenses</p>
                              <p className="text-sm font-black italic">{formatCurrency(p.totalExpenses)}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2 border-t border-slate-100 dark:border-white/5 pt-4 md:border-t-0 md:pt-0">
                              <p className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Project Profit</p>
                              <p className={`text-xl font-black italic font-display ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(p.profit)}</p>
                            </div>
                          </div>
                          <div className="p-7 bg-slate-50/50 dark:bg-white/5 rounded-[35px] group-hover:bg-indigo-600 group-hover:text-white transition-all duration-700">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase opacity-60">Balance Due</p>
                              <p className="text-2xl font-black italic">{formatCurrency(p.balance)}</p>
                            </div>
                            <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 text-center justify-center">
                              Explore Detailed Deep-Dive <ChevronRight size={14} strokeWidth={4} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {panchayats.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <Package size={48} className="mb-4 opacity-50" />
                      <p className="font-bold">No panchayats registered yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-10 animate-slide-up">
                <div className="glass rounded-[50px] shadow-3xl overflow-hidden border">
                  <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-rose-500/5">
                    <div>
                      <h3 className="text-3xl font-black font-display italic text-rose-500">Global Order Manager</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Admin Control Panel • Full Access</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
                            setOrders([]);
                            setExpenses([]);
                            setIncomes([]);
                            setPanchayats([]);
                            localStorage.clear();
                            window.location.reload();
                          }
                        }}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white transition-all"
                      >
                        Reset Application
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        <th className="px-12 py-8">ID / Panchayat</th>
                        <th className="px-12 py-8 text-center">Entity</th>
                        <th className="px-12 py-8 text-center">Status</th>
                        <th className="px-12 py-8 text-right">Value</th>
                        <th className="px-12 py-8 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                      {orders.map((order) => (
                        <tr key={order.id} className="group hover:bg-rose-50/30 dark:hover:bg-white/5 transition-all">
                          <td className="px-12 py-8">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black font-mono text-indigo-500 uppercase mb-1">{order.id.slice(0, 8)}</span>
                              <span className="font-black text-lg text-slate-700 dark:text-slate-200 italic uppercase leading-none font-display">{order.panchayatName}</span>
                            </div>
                          </td>
                          <td className="px-12 py-8 text-center">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm uppercase">{order.workName || 'Unnamed'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{order.workCode || '-'}</span>
                            </div>
                          </td>
                          <td className="px-12 py-8 text-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${order.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-12 py-8 text-right">
                            <span className="text-xl font-black italic font-display">{formatCurrency(order.amount)}</span>
                          </td>
                          <td className="px-12 py-8 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingOrder(order)}
                                className="p-3 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors"
                              >
                                <Edit2 size={16} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => deleteOrder(order.id, e)}
                                className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                              >
                                <Trash2 size={16} strokeWidth={3} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {
              activeTab === 'orders' && (
                <div className="space-y-10 animate-slide-up">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" size={28} />
                      <input
                        type="text"
                        placeholder="Enterprise Search: Codes, Entities, or Units..."
                        className="w-full pl-20 pr-8 py-6 rounded-[32px] border bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl outline-none font-bold text-xl shadow-inner focus:ring-4 focus:ring-indigo-500/5"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-[35px] border shadow-inner">
                      {['All', 'Paid', 'Unpaid'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status as any)}
                          className={`px-12 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${filterStatus === status ? 'gradient-bg text-white shadow-2xl' : 'text-slate-400 hover:text-indigo-500'
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-[50px] shadow-3xl overflow-hidden border">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                          <th className="px-12 py-8">Entity Index</th>
                          <th className="px-12 py-8 text-center">Batch Logic</th>
                          <th className="px-12 py-8 text-center">Payment Date</th>
                          <th className="px-12 py-8 text-center">Payment Loop</th>
                          <th className="px-12 py-8 text-right">Net Valuation</th>
                          {isAdmin && <th className="px-12 py-8 text-center">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="group hover:bg-slate-50/70 dark:hover:bg-white/5 transition-all">
                            <td className="px-12 py-8">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black font-mono text-indigo-500 uppercase mb-1">{order.workCode || 'SYS-INDEX'}</span>
                                <span className="font-black text-2xl group-hover:text-indigo-500 italic uppercase leading-none font-display">{order.panchayatName}</span>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase">{order.quantity || 1} Units</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                                  <span className="text-[10px] font-black text-slate-500 italic truncate max-w-sm uppercase">{order.workName || 'General Item'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-12 py-8 text-center">
                              <button
                                onClick={() => togglePlacementStatus(order.id)}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${order.isPlaced ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                  }`}
                              >
                                {order.isPlaced ? 'Delivered' : 'Pending'}
                              </button>
                            </td>
                            <td className="px-12 py-8 text-center">
                              <span className={`text-[11px] font-black uppercase tracking-widest ${order.paymentDate ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                                {order.paymentDate || '-'}
                              </span>
                            </td>
                            <td className="px-12 py-8 text-center">
                              <button
                                onClick={() => togglePaymentStatus(order.id)}
                                className={`px-10 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${order.status === 'Paid' ? 'bg-emerald-500 text-white' : order.status === 'No Bill' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                                  }`}
                              >
                                {order.status}
                              </button>
                            </td>
                            <td className="px-12 py-8 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-2xl font-black italic font-display">{formatCurrency(order.amount)}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5">@ ₹{order.rate} / Unit</span>
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="px-12 py-8 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setEditingOrder(order)}
                                    className="p-3 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors"
                                    title="Edit Order"
                                  >
                                    <Edit2 size={16} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={(e) => deleteOrder(order.id, e)}
                                    className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={16} strokeWidth={3} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }

            {
              activeTab === 'expenses' && (
                <div className="space-y-10 animate-slide-up">
                  <div className="flex flex-col lg:flex-row gap-8 justify-between items-end">
                    <div>
                      <h2 className="text-4xl font-black font-display italic tracking-tight mb-2">Expense Tracker</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Manage costs & project overheads</p>
                    </div>
                    <div className="flex gap-4">
                      {isAdmin && (
                        <button
                          onClick={() => setShowCategoryModal(true)}
                          className="px-6 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                          <Layers size={16} />
                          Config Categories
                        </button>
                      )}
                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="px-8 py-4 gradient-bg text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Log Expense
                      </button>
                    </div>
                  </div>

                  {/* Expense Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-8 rounded-[32px] border relative overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtered Outflow</p>
                      <p className="text-4xl font-black italic mt-2 font-display">{formatCurrency(totalFilteredExpenses)}</p>
                    </div>
                    <div className="glass p-8 rounded-[32px] border relative overflow-hidden">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Categories</p>
                      <p className="text-4xl font-black italic mt-2 font-display">{categories.length}</p>
                    </div>
                  </div>

                  {/* CATEGORY CONSOLIDATION (GLOBAL - DATE FILTERED) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {categories.map(cat => {
                      const catTotal = filteredByDateExpenses
                        .filter(e => e.categoryId === cat.id)
                        .reduce((sum, e) => sum + e.amount, 0);

                      // Show all categories, but dim the zero ones
                      const isEmpty = catTotal === 0;

                      return (
                        <div
                          key={cat.id}
                          onClick={() => setDetailCategory(cat)}
                          className={`glass p-6 rounded-[28px] border relative overflow-hidden group hover:bg-indigo-50 dark:hover:bg-white/5 transition-all cursor-pointer ${isEmpty ? 'opacity-50 grayscale' : ''}`}
                        >
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{cat.name}</p>
                          <p className="text-2xl font-black italic mt-1 font-display group-hover:text-indigo-500 transition-colors">{formatCurrency(catTotal)}</p>
                          <div className="absolute top-4 right-4 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
                            <Layers size={32} />
                          </div>
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">View Details <ArrowRight size={8} /></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CATEGORY DETAIL MODAL */}
                  {detailCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl p-10 rounded-[40px] shadow-2xl relative max-h-[90vh] flex flex-col">
                        <button
                          onClick={() => setDetailCategory(null)}
                          className="absolute top-6 right-6 p-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-white/5 rounded-full"
                        >
                          <X size={24} />
                        </button>

                        <div className="mb-8">
                          <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Category Detailed Report</span>
                          <h2 className="text-4xl font-black font-display italic mt-2">{detailCategory.name}</h2>
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                            Period: {dateRange === 'custom' ? `${customStartDate} to ${customEndDate}` : dateRange.replace('-', ' ')}
                          </p>
                          <div className="mt-4 inline-block px-6 py-2 bg-slate-100 dark:bg-white/5 rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">
                              Total Selected Period ({selectedPanchayatDetails ? 'This Panchayat' : 'Global'})
                            </span>
                            <span className="text-xl font-black font-display italic">
                              {formatCurrency(filteredByDateExpenses
                                .filter(e => e.categoryId === detailCategory.id)
                                .filter(e => !selectedPanchayatDetails || e.panchayatId === (selectedPanchayatDetails as any).id)
                                .reduce((sum, e) => sum + e.amount, 0))}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar pr-4">
                          <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
                                <th className="py-4">Date</th>
                                <th className="py-4">Description</th>
                                <th className="py-4">Linked Panchayat</th>
                                <th className="py-4 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                              {filteredByDateExpenses
                                .filter(e => e.categoryId === detailCategory.id)
                                .filter(e => !selectedPanchayatDetails || e.panchayatId === (selectedPanchayatDetails as any).id)
                                .map(exp => (
                                  <tr key={exp.id} className="group hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="py-4 text-[11px] font-bold text-slate-500">{exp.date}</td>
                                    <td className="py-4 text-sm font-bold text-slate-700 dark:text-slate-200">{exp.description}</td>
                                    <td className="py-4 text-[10px] font-black text-indigo-500 uppercase italic">
                                      {panchayats.find(p => p.id === exp.panchayatId)?.name || '-'}
                                    </td>
                                    <td className="py-4 text-right font-black font-display italic">{formatCurrency(exp.amount)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          {filteredByDateExpenses
                            .filter(e => e.categoryId === detailCategory.id)
                            .filter(e => !selectedPanchayatDetails || e.panchayatId === (selectedPanchayatDetails as any).id)
                            .length === 0 && (
                              <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs italic">No expenses found in this range.</p>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                          <button onClick={() => setDetailCategory(null)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                            Close Report
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="glass rounded-[50px] shadow-3xl overflow-hidden border">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                          <th className="px-12 py-8">Date</th>
                          <th className="px-12 py-8">Description</th>
                          <th className="px-12 py-8 text-center">Category</th>
                          <th className="px-12 py-8 text-center">Project Link</th>
                          <th className="px-12 py-8 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-12 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50">
                              No expenses logged yet
                            </td>
                          </tr>
                        ) : (
                          expenses.map((expense) => (
                            <tr key={expense.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-12 py-8 text-xs font-bold font-mono text-slate-500">{expense.date}</td>
                              <td className="px-12 py-8 font-bold text-slate-700 dark:text-slate-200">{expense.description}</td>
                              <td className="px-12 py-8 text-center">
                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                                  {expense.categoryName}
                                  {expense.subCategory && <span className="opacity-50 ml-1">/ {expense.subCategory}</span>}
                                </span>
                              </td>
                              <td className="px-12 py-8 text-center">
                                {expense.panchayatId ? (
                                  <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center justify-center gap-1">
                                    <Building2 size={12} />
                                    {panchayats.find(p => p.id === expense.panchayatId)?.name || 'Unknown'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300 uppercase">-</span>
                                )}
                              </td>
                              <td className="px-12 py-8 text-right font-black font-display italic text-lg">
                                {formatCurrency(expense.amount)}
                                {/* ADMIN ONLY: Edit & Delete Expense */}
                                {isAdmin && (
                                  <div className="flex items-center justify-end">
                                    <button
                                      onClick={() => { setEditingExpense(expense); setShowExpenseModal(true); }}
                                      className="ml-4 p-2 rounded-lg text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Edit Expense"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => deleteExpense(expense.id, e)}
                                      className="ml-2 p-2 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Delete Expense"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div >
        )
        }

        {/* Modals properly nested in Home */}
        {
          showPanchayatModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in overflow-y-auto">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-[50px] shadow-3xl p-12 relative border border-white/10 my-8">
                <button onClick={() => setShowPanchayatModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-rose-500 transition-colors">
                  <XCircle size={32} />
                </button>
                <div className="flex items-center gap-5 mb-12">
                  <div className="w-20 h-20 gradient-bg rounded-[32px] flex items-center justify-center text-white shadow-2xl">
                    <Settings size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black font-display italic leading-none">{editingPanchayat ? 'Configure Entity' : 'New Registry'}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Setup prices and unit tracking</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const prices: BoardPrices = {
                    type1: parseFloat(formData.get('type1') as string || '0'),
                    type2: parseFloat(formData.get('type2') as string || '0'),
                    type3: parseFloat(formData.get('type3') as string || '0'),
                    type4: parseFloat(formData.get('type4') as string || '0'),
                  };

                  const vendorStr = formData.get('vendors') as string || '';
                  const vendorsList = vendorStr.split(',').map(v => v.trim()).filter(v => v.length > 0);

                  savePanchayat(
                    formData.get('name') as string,
                    formData.get('person') as string,
                    formData.get('phone') as string,
                    prices,
                    vendorsList,
                    formData.get('district') as string,
                    formData.get('block') as string,
                    formData.get('nregaGP') as string
                  );
                }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Official Location Name</label>
                      <input name="name" defaultValue={editingPanchayat?.name} required placeholder="Kozhikode North..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent focus:border-indigo-500 outline-none font-bold text-base transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Liasion Officer</label>
                      <input name="person" defaultValue={editingPanchayat?.contactPerson} placeholder="Full Name" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent focus:border-indigo-500 outline-none font-bold text-base transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Vendor Names (Comma separated)</label>
                    <input name="vendors" defaultValue={editingPanchayat?.vendors?.join(', ')} placeholder="VENKATESH TRADERS, SHAILESH KHAN .V" className="w-full px-6 py-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-base transition-all" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">District</label>
                      <input name="district" defaultValue={editingPanchayat?.district} placeholder="e.g. KOZHIKODE" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Block</label>
                      <input name="block" defaultValue={editingPanchayat?.block} placeholder="e.g. Areacode" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">GP Name (for NREGA)</label>
                      <input name="nregaGP" defaultValue={editingPanchayat?.nregaGP} placeholder="e.g. Areacode" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-500/5 rounded-[40px] border border-indigo-500/10">
                    <div className="flex items-center gap-3 mb-6">
                      <IndianRupee className="text-indigo-500" size={18} />
                      <h4 className="text-base font-black font-display uppercase tracking-widest italic leading-none pt-1">Unit Pricing Schema</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-indigo-500/70 ml-2">Type {idx}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                            <input
                              name={`type${idx}`}
                              type="number"
                              defaultValue={editingPanchayat?.boardPrices?.[`type${idx}` as keyof BoardPrices] || 0}
                              className="w-full pl-6 pr-3 py-3 rounded-xl bg-white dark:bg-slate-900 border-none outline-none font-black text-center text-sm focus:ring-2 focus:ring-indigo-500/10"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="w-full py-6 gradient-bg text-white rounded-[30px] font-black uppercase text-xs tracking-[0.3em] shadow-3xl shadow-indigo-500/30 active:scale-95 transition-all mt-4">
                    {editingPanchayat ? 'Commit Updates' : 'Initialize Entity'}
                  </button>
                </form>
              </div>
            </div>
          )
        }

        {
          showUploadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[50px] shadow-3xl p-12 relative border border-white/10">
                <button onClick={() => setShowUploadModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-indigo-500 transition-colors">
                  <XCircle size={32} />
                </button>
                <div className="flex items-center gap-5 mb-12">
                  <div className="w-20 h-20 gradient-bg rounded-[32px] flex items-center justify-center text-white shadow-2xl">
                    <Upload size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black font-display italic leading-none">Smart Import</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Calculate units & rates</p>
                  </div>
                </div>


                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 italic">Specify Project Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((idx) => {
                        const typeId = `type${idx}` as keyof BoardPrices;
                        const p = panchayats.find(p => p.id === selectedPanchayatId);
                        const rate = p?.boardPrices[typeId] || 0;

                        return (
                          <button
                            key={idx}
                            onClick={() => setImportBoardType(typeId)}
                            className={`p-6 rounded-3xl text-left border-2 transition-all relative overflow-hidden ${importBoardType === typeId
                              ? 'border-indigo-500 bg-indigo-500/5 shadow-xl scale-[1.02]'
                              : 'border-transparent bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                              }`}
                          >
                            <p className={`text-[10px] font-black uppercase tracking-widest ${importBoardType === typeId ? 'text-indigo-500' : 'text-slate-400'}`}>Board {idx}</p>
                            <p className="text-xl font-black italic mt-1 font-display">₹{rate}</p>
                            {importBoardType === typeId && (
                              <div className="absolute -right-2 -bottom-2 p-2 bg-indigo-500 text-white rounded-tl-2xl">
                                <Check size={16} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-white/5">
                    <label className="group relative block w-full aspect-[2/1] rounded-[45px] bg-slate-50 dark:bg-slate-800/30 border-3 border-dashed border-indigo-500/20 hover:border-indigo-500 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-10">
                      <div className="w-20 h-20 rounded-[30px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-sm mb-6">
                        <Plus size={40} />
                      </div>
                      <p className="font-black italic text-slate-500 group-hover:text-indigo-500 uppercase text-xs tracking-[0.3em]">Drop Unit Datasheet</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Supported: .xlsx / .xls formatted sheets</p>
                      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          editingOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in text-left">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[50px] shadow-3xl p-12 relative border border-white/10">
                <button onClick={() => setEditingOrder(null)} className="absolute top-10 right-10 text-slate-400 hover:text-indigo-500 transition-colors">
                  <XCircle size={32} />
                </button>
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-[24px] flex items-center justify-center shadow-lg">
                    <Edit2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-display italic leading-none">Modify Order</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest italic">{editingOrder.workCode || 'System Entry'}</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amountStr = formData.get('amount') as string;
                  const newWorkName = formData.get('workName') as string;
                  const newAmount = amountStr ? parseFloat(amountStr) : 0;
                  const newStatus = formData.get('status') as PaymentStatus;
                  const newPaymentDate = formData.get('paymentDate') as string;
                  const newDate = formData.get('date') as string;
                  const newWorkCode = formData.get('workCode') as string;

                  setOrders(orders.map(o => {
                    if (o.id === editingOrder.id) {
                      return {
                        ...o,
                        workName: newWorkName,
                        amount: newAmount,
                        status: newStatus,
                        paymentDate: newPaymentDate,
                        date: newDate,
                        workCode: newWorkCode
                      };
                    }
                    return o;
                  }));

                  // Auto-Push to Cloud
                  try {
                    const { error } = await supabase.from('orders').update({
                      work_name: newWorkName,
                      amount: newAmount,
                      status: newStatus,
                      payment_date: newPaymentDate,
                      date: newDate,
                      work_code: newWorkCode
                    }).eq('id', editingOrder.id);
                    if (error) console.error("Cloud Order Update Failed:", error);
                  } catch (err) {
                    console.error("Cloud Order Update Error:", err);
                  }

                  setEditingOrder(null);
                }} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Work Name / Item</label>
                    <input name="workName" defaultValue={editingOrder.workName} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent focus:border-indigo-500 outline-none font-bold text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Work Code</label>
                      <input name="workCode" defaultValue={editingOrder.workCode} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Date</label>
                      <input type="date" name="date" defaultValue={editingOrder.date} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Net Value (₹)</label>
                      <input type="number" step="0.01" name="amount" defaultValue={editingOrder.amount} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Status</label>
                      <select name="status" defaultValue={editingOrder.status} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm">
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Payment Date (Optional)</label>
                    <input name="paymentDate" defaultValue={editingOrder.paymentDate} placeholder="DD/MM/YYYY" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                  </div>

                  <button type="submit" className="w-full py-5 gradient-bg text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">
                    Update Record
                  </button>
                </form>
              </div>
            </div>
          )
        }

        {
          showCategoryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in text-left">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-[50px] shadow-3xl p-12 relative border border-white/10 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowCategoryModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-indigo-500 transition-colors">
                  <XCircle size={32} />
                </button>
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 gradient-bg text-white rounded-[24px] flex items-center justify-center shadow-lg">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-display italic leading-none">Category Manager</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Define expense structure</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const subCats = (formData.get('subCategories') as string).split(',').map(s => s.trim()).filter(s => s.length > 0);
                    saveCategory(
                      formData.get('name') as string,
                      subCats,
                      formData.get('isPanchayatLinked') === 'on'
                    );
                    (e.target as HTMLFormElement).reset();
                  }} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">Add New Category</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Name</label>
                        <input name="name" required placeholder="e.g. Site Consumables" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 outline-none text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Sub-Categories</label>
                        <input name="subCategories" required placeholder="Gloves, Helmets, Tools..." className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 outline-none text-xs font-bold" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <input type="checkbox" name="isPanchayatLinked" id="linkProject" className="w-5 h-5 rounded-md accent-indigo-500" />
                      <label htmlFor="linkProject" className="text-xs font-bold text-slate-600 dark:text-slate-300">Link to Panchayat Projects? (Requires Project Selection in Expenses)</label>
                    </div>

                    <button type="submit" className="w-full py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                      Create Category
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Existing Categories</h4>
                    {categories.map(cat => (
                      <div key={cat.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{cat.name}</p>
                            {cat.isPanchayatLinked && <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-0.5 rounded uppercase">Project Linked</span>}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-1">{cat.subCategories.join(', ')}</p>
                        </div>
                        <button
                          onClick={() => setCategories(categories.filter(c => c.id !== cat.id))}
                          className="p-2 bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          showExpenseModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in text-left">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[50px] shadow-3xl p-12 relative border border-white/10">
                <button onClick={() => setShowExpenseModal(false)} className="absolute top-10 right-10 text-slate-400 hover:text-indigo-500 transition-colors">
                  <XCircle size={32} />
                </button>
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 gradient-bg text-white rounded-[24px] flex items-center justify-center shadow-lg">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-display italic leading-none">Log Expense</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Record new outflow</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  saveExpense(
                    formData.get('description') as string,
                    parseFloat(formData.get('amount') as string),
                    formData.get('date') as string,
                    selectedExpenseCatId,
                    formData.get('subCategory') as string,
                    formData.get('panchayatId') as string
                  );
                }} className="space-y-6">

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Category</label>
                    <select
                      name="categoryId"
                      value={selectedExpenseCatId}
                      onChange={(e) => setSelectedExpenseCatId(e.target.value)}
                      required
                      className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm"
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {selectedExpenseCatId && (() => {
                    const cat = categories.find(c => c.id === selectedExpenseCatId);
                    return (
                      <div className="space-y-1 animate-fade-in">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Sub-Category</label>
                        <select name="subCategory" required className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm">
                          {cat?.subCategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                      </div>
                    );
                  })()}

                  {selectedExpenseCatId && categories.find(c => c.id === selectedExpenseCatId)?.isPanchayatLinked && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 ml-3">Linked Panchayat</label>
                      <select name="panchayatId" required className="w-full px-5 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 outline-none font-bold text-sm">
                        <option value="">Select Project...</option>
                        {panchayats.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Description</label>
                    <input name="description" required placeholder="e.g. Purchase of 50 bags" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Amount (₹)</label>
                      <input type="number" name="amount" required placeholder="0.00" className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent outline-none font-bold text-sm" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 gradient-bg text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">
                    Save Expense Record
                  </button>
                </form>
              </div>
            </div>
          )
        }

        {
          showAdminLogin && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-fade-in">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[40px] shadow-3xl p-10 relative border border-white/10 text-center">
                <button onClick={() => setShowAdminLogin(false)} className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors">
                  <XCircle size={24} />
                </button>
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Lock size={32} />
                </div>
                <h3 className="text-2xl font-black font-display italic">Admin Access</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest mb-8">Enter secure pin to continue</p>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPin === '1234') {
                    setIsAdmin(true);
                    setShowAdminLogin(false);
                    setActiveTab('admin');
                    setAdminPin('');
                  } else {
                    alert('Invalid Security PIN');
                  }
                }}>
                  <input
                    type="password"
                    autoFocus
                    placeholder="PIN"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full text-center text-3xl font-black tracking-[1em] py-4 bg-slate-50 dark:bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 mb-6"
                    maxLength={4}
                  />
                  <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
                    Unlock Console
                  </button>
                </form>
              </div>
            </div>
          )
        }
      </main >

      {/* Delete Confirmation Modal */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-[40px] shadow-3xl p-10 relative border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[30px] flex items-center justify-center mb-6 animate-pulse">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-2xl font-black font-display italic">Confirm Deletion</h3>
                <p className="text-sm font-bold text-slate-400 mt-4 leading-relaxed">
                  Are you sure you want to remove this {deleteTarget?.type}? This action cannot be undone.
                </p>
                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteTarget?.type === 'order') {
                        setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
                      } else if (deleteTarget?.type === 'panchayat') {
                        setPanchayats(prev => prev.filter(p => p.id !== deleteTarget.id));
                      }
                      setShowDeleteModal(false);
                      // alert('Deletion successful.');
                    }}
                    className="py-4 bg-rose-500 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-colors"
                  >
                    Securely Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Duplicate Report Modal */}
      {
        showDuplicateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowDuplicateModal(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[40px] shadow-3xl p-10 relative border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowDuplicateModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-indigo-500 transition-colors">
                <XCircle size={24} />
              </button>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-[28px] flex items-center justify-center shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-display italic">Skipped Duplicates</h3>
                  <p className="text-sm font-bold text-slate-400 mt-1">Found {duplicateList.length} items already in system</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-white/5">
                <ul className="space-y-3">
                  {duplicateList.map((code, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</span>
                      {code}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setShowDuplicateModal(false)}
                className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}

function BuildingsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 col-span-full">
      <div className="w-40 h-40 rounded-[60px] bg-indigo-500/5 flex items-center justify-center text-slate-200 dark:text-slate-800 animate-pulse transition-all">
        <Building2 size={80} strokeWidth={0.5} />
      </div>
      <div className="text-center">
        <h4 className="text-4xl font-black font-display italic tracking-tight">Registry Unavailable</h4>
        <p className="text-slate-400 font-bold mt-3 max-w-sm mx-auto leading-relaxed uppercase text-[10px] tracking-widest opacity-60">Complete the initial entity setup to unlock pricing schemas and unit ledger tracking.</p>
      </div>
    </div>
  );
}
