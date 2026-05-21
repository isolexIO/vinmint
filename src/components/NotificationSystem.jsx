import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Zap, Gift, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notification } from '@/entities/Notification';
import { createPageUrl } from '@/utils';

const NotificationIcon = ({ type }) => {
    switch (type) {
        case 'transaction':
            return <Zap className="w-5 h-5 text-yellow-400" />;
        case 'nft_mint':
            return <FileText className="w-5 h-5 text-purple-400" />;
        case 'reward':
            return <Gift className="w-5 h-5 text-green-400" />;
        default:
            return <Bell className="w-5 h-5 text-slate-400" />;
    }
};

export default function NotificationSystem({ notifications, onClear, onClearAll }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClearNotification = async (id) => {
        try {
            await Notification.update(id, { is_read: true });
            onClear(id);
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };
    
    const handleClearAllNotifications = async () => {
         try {
            const unreadIds = notifications.map(n => n.id);
            // In a real scenario, you'd have a bulk update endpoint
            // For now, we'll do it one by one
            await Promise.all(unreadIds.map(id => Notification.update(id, { is_read: true })));
            onClearAll();
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (notification.link_to) {
            window.location.href = notification.link_to;
        }
        handleClearNotification(notification.id);
        setIsOpen(false);
    };

    return (
        <>
            <div className="fixed bottom-5 right-5 z-50">
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    className="rounded-full w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:scale-110 transition-transform duration-300"
                >
                    <Bell className="w-8 h-8" />
                    {notifications.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2">
                            {notifications.length}
                        </Badge>
                    )}
                </Button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="fixed bottom-24 right-5 w-80 max-w-[90vw] bg-slate-800/80 backdrop-blur-lg border border-purple-500/30 rounded-xl shadow-2xl z-40"
                    >
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-white">Notifications</h3>
                            {notifications.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={handleClearAllNotifications} className="text-slate-400 hover:text-white">
                                    Clear All
                                </Button>
                            )}
                        </div>
                        <div className="p-2 max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className="p-3 hover:bg-slate-700/50 rounded-lg cursor-pointer"
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <NotificationIcon type={notif.type} />
                                            <p className="text-sm text-slate-200 flex-1">{notif.message}</p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 text-slate-500 hover:text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearNotification(notif.id);
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-400 py-8">No new notifications</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}