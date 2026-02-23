import { useState } from 'react'
import VarietiesTab from './VarietiesTab'
import ItemsTab from './ItemsTab'
import CustomersTab from './CustomersTab'
import './MasterDataPage.css'

const TABS = [
  { key: 'variety', label: 'Varieties' },
  { key: 'items', label: 'Items' },
  { key: 'customers', label: 'Customers' },
]

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('variety')

  return (
    <div className="master-container">
      <div className="master-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`master-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'variety' && <VarietiesTab />}
      {activeTab === 'items' && <ItemsTab />}
      {activeTab === 'customers' && <CustomersTab />}
    </div>
  )
}
