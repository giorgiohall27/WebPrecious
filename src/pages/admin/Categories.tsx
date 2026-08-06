import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Plus, Edit3, Trash2, GripVertical, ChevronDown, ChevronRight, Wine, UtensilsCrossed, SprayCan, Package, HeartPulse } from 'lucide-react';
import { useProducts } from '../../store/productsStore';

const iconMap: Record<string, any> = { wine: Wine, 'utensils-crossed': UtensilsCrossed, 'spray-can': SprayCan, package: Package, 'heart-pulse': HeartPulse };

export default function Categories() {
  const { t } = useTranslation();
  const {
    categories,
    subcategories,
    products,
    upsertCategory,
    removeCategory,
    upsertSubcategory,
    removeSubcategory,
  } = useProducts();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'category' | 'subcategory'>('category');
  const [newName, setNewName] = useState('');
  const [selectedParent, setSelectedParent] = useState('');

  const getSubcats = (catId: string) => subcategories.filter(sc => sc.categoryId === catId);
  const getProductCount = (catId: string) => products.filter(p => p.categoryId === catId).length;

  const addItem = () => {
    if (!newName.trim()) return;
    if (addType === 'category') {
      upsertCategory({
        id: `cat-new-${Date.now()}`,
        name: newName.trim(),
        key: newName.toLowerCase().replace(/\s+/g, '_'),
        icon: 'package',
        order: categories.length + 1,
        active: true,
      });
    } else {
      if (!selectedParent) return;
      upsertSubcategory({
        id: `sub-new-${Date.now()}`,
        categoryId: selectedParent,
        name: newName.trim(),
        key: newName.toLowerCase().replace(/\s+/g, '_'),
        order: subcategories.length + 1,
        active: true,
      });
    }
    setNewName('');
    setShowAddModal(false);
  };

  const deleteCategory = (id: string) => {
    if (confirm(t('categories.deleteConfirm'))) {
      removeCategory(id);
    }
  };

  const toggleActive = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) upsertCategory({ ...category, active: !category.active });
  };

  const toggleSubcategoryActive = (id: string) => {
    const subcategory = subcategories.find(sc => sc.id === id);
    if (subcategory) upsertSubcategory({ ...subcategory, active: !subcategory.active });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-surface-900">{t('categories.title')}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { setAddType('subcategory'); setShowAddModal(true); }} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" /> {t('categories.addSubcategory')}
          </button>
          <button onClick={() => { setAddType('category'); setShowAddModal(true); }} className="btn-primary text-sm" id="add-category-btn">
            <Plus className="w-4 h-4" /> {t('categories.addCategory')}
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="card p-12 text-center text-surface-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{t('categories.noCategories')}</p>
          </div>
        ) : (
          categories.map(cat => {
            const Icon = iconMap[cat.icon] || Package;
            const subcats = getSubcats(cat.id);
            const isExpanded = expandedCat === cat.id;
            const productCount = getProductCount(cat.id);

            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors cursor-pointer" onClick={() => setExpandedCat(isExpanded ? null : cat.id)}>
                  <GripVertical className="w-4 h-4 text-surface-300 cursor-grab" />
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900">{cat.name}</h3>
                    <p className="text-xs text-surface-400">{subcats.length} subcategorías · {productCount} {t('categories.productsCount').toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); toggleActive(cat.id); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        cat.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                      }`}>
                      {cat.active ? t('common.active') : t('common.inactive')}
                    </button>
                    <button onClick={e => { e.stopPropagation(); }} className="btn-icon"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id); }} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-surface-400" /> : <ChevronRight className="w-5 h-5 text-surface-400" />}
                  </div>
                </div>

                {/* Subcategories */}
                {isExpanded && subcats.length > 0 && (
                  <div className="border-t border-surface-100 bg-surface-50/50">
                    {subcats.map(sc => (
                      <div key={sc.id} className="flex items-center gap-4 px-6 py-3 pl-20 hover:bg-surface-100/50 transition-colors">
                        <GripVertical className="w-3.5 h-3.5 text-surface-300" />
                        <span className="text-sm text-surface-700 flex-1">{sc.name}</span>
                        <button
                          onClick={() => toggleSubcategoryActive(sc.id)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.active ? 'bg-green-50 text-green-700' : 'bg-surface-200 text-surface-500'}`}
                        >
                          {sc.active ? t('common.active') : t('common.inactive')}
                        </button>
                        <button className="btn-icon"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeSubcategory(sc.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">
                {addType === 'category' ? t('categories.addCategory') : t('categories.addSubcategory')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="input-label">{addType === 'category' ? t('categories.categoryName') : t('categories.subcategoryName')}</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field" autoFocus />
              </div>
              {addType === 'subcategory' && (
                <div>
                  <label className="input-label">{t('categories.parentCategory')}</label>
                  <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)} className="input-field">
                    <option value="">—</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button onClick={addItem} className="btn-primary">{t('common.create')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
