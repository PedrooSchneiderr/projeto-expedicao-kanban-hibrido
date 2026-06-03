import asyncio
from datetime import datetime, timedelta
from . import database, models, websocket
import logging

async def monitor_sla():
    while True:
        db = next(database.get_db())
        try:
            orders = db.query(models.Order).filter(models.Order.is_archived == False).all()
            for order in orders:
                threshold = datetime.utcnow() - timedelta(minutes=5)
                if order.updated_at < threshold:
                    await websocket.manager.broadcast({
                        "type": "sla_alert",
                        "order_id": order.id,
                        "client_name": order.client_name,
                        "status": order.status
                    })
        except Exception as e:
            logging.error(f"SLA Monitor error: {e}")
        finally:
            db.close()
        await asyncio.sleep(60)

async def cleanup_old_archived_orders():
    while True:
        db = next(database.get_db())
        try:
            threshold = datetime.utcnow() - timedelta(days=30)
            old_orders = db.query(models.Order).filter(models.Order.is_archived == True, models.Order.archived_at < threshold).all()
            for order in old_orders:
                db.delete(order)
            db.commit()
        except Exception as e:
            logging.error(f"Cleanup task error: {e}")
        finally:
            db.close()
        await asyncio.sleep(86400)
