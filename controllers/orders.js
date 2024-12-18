const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const CompactDisk = require("../models/CompactDisk");
const User = require("../models/User");
const Artist = require("../models/Artist");

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params; // Получаем ID заказа из параметров
    const { items } = req.body;     // Получаем новые данные из тела запроса

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let totalPrice = 0;
    const updatedItems = [];

    for (const item of items) {
      const compactDisk = await CompactDisk.findByPk(item.cdId);
      if (!compactDisk) {
        return res.status(404).json({ message: `CompactDisk with id ${item.cdId} not found` });
      }
      totalPrice += compactDisk.price * item.quantity;
      updatedItems.push({
        cdId: item.cdId,
        quantity: item.quantity,
      });
    }

    // Удаляем старые записи деталей заказа
    await OrderDetail.destroy({ where: { OrderId: orderId } });

    // Добавляем новые детали заказа
    for (const item of updatedItems) {
      await OrderDetail.create({
        OrderId: order.id,
        CompactDiskId: item.cdId,
        quantity: item.quantity,
      });
    }

    // Обновляем общую стоимость заказа
    order.totalPrice = totalPrice;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getOrdersForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.findAll({
      where: { userId },
      attributes: ["totalPrice"],
      include: [
        {
          model: User,
          attributes: ["name", "email"],
        },
        {
          model: OrderDetail,
          attributes: ["quantity"],
          include: [
            {
              model: CompactDisk,
              attributes: ["title", "price"],
              include: [{ model: Artist, attributes: ["name"] }]
            },
          ],
        },
      ],
    });

    if (!orders.length) {
      return res.status(204).json({ message: "No orders found for this user" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const compactDisk = await CompactDisk.findByPk(item.cdId);
      if (!compactDisk) {
        return res.status(404).json({ message: `CompactDisk with id ${item.cdId} not found` });
      }
      totalPrice += compactDisk.price * item.quantity;
      orderItems.push({
        cdId: item.cdId,
        quantity: item.quantity,
      });
    }

    const newOrder = await Order.create({ userId, totalPrice });

    for (const item of orderItems) {
      await OrderDetail.create({
        OrderId: newOrder.id,
        CompactDiskId: item.cdId,
        quantity: item.quantity,
      });
    }

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderDetail,
          include: [CompactDisk],
        },
        { model: User },
      ],
    });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderDetail,
          include: [CompactDisk],
        },
        { model: User },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await OrderDetail.destroy({ where: { OrderId: id } });
    await order.destroy();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
