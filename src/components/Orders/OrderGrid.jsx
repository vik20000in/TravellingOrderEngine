import { memo } from 'react'
import ItemSection from './ItemSection'

function OrderGrid({ items, varieties, quantities, notes, setQty, setNote }) {
  return (
    <>
      {items.map((item, iIdx) => (
        <ItemSection
          key={item.id || iIdx}
          item={item}
          iIdx={iIdx}
          varieties={varieties}
          quantities={quantities}
          notes={notes}
          setQty={setQty}
          setNote={setNote}
        />
      ))}
    </>
  )
}

export default memo(OrderGrid)
