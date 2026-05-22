const getStatusProgress = (itemStatus, orderUpdatedAt = null) => {
  
  const statusMapping = {
    "PENDING": "PENDING",
    "ACCEPTED": "CONFIRMED",
    "PACKED": "PROCESSING",
    "SHIPPED": "OUT_FOR_DELIVERY",
    "DELIVERED": "DELIVERED",
    "CANCELLED": "PENDING"
  };

  const effectiveStatus = statusMapping[itemStatus] || "PENDING";
  const currentIndex = getStatusIndex(effectiveStatus);

  const sequence = [
    { key: "PENDING",     label: "Order Placed",      icon: "📝" },
    { key: "CONFIRMED",   label: "Order Confirmed",   icon: "✅" },
    { key: "PROCESSING",  label: "Processing",        icon: "🔄" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🚚" },
    { key: "DELIVERED",   label: "Delivered",         icon: "🎉" },
  ];

  return sequence.map((step, index) => ({
    status: step.key,
    label: step.label,
    icon: step.icon,
    isCompleted: index < currentIndex,
    isCurrent: index === currentIndex,
    updatedAt: orderUpdatedAt   // ← Sabhi steps mein same updatedAt daal rahe hain
  }));
};

const getStatusIndex = (status) => {
  const orderList = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"];
  return orderList.indexOf(status);
};

export { getStatusProgress, getStatusIndex };
