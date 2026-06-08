// ============================================================
// CONTROLLER: UPLOAD
// Gerencia o upload de imagens do usuário:
//   - Avatar (foto de perfil)
//   - Capa (banner do perfil)
// Suporta upload direto (Multer) e URL externa (para capa).
// ============================================================

const User = require('../models/User');

// ============================================================
// 1. UPLOAD DE AVATAR
// Recebe um arquivo de imagem via Multer.
// Atualiza o campo avatarUrl do usuário.
// Retorna a URL completa para o frontend.
// ============================================================
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    
    // Constrói a URL completa (ex: http://localhost:5000/uploads/123456-avatar.jpg)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl },
      { new: true }
    );
    
    res.json({ 
      message: 'Avatar atualizado com sucesso!',
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Erro uploadAvatar:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do avatar.' });
  }
};

// ============================================================
// 2. UPLOAD DE CAPA (ARQUIVO)
// Mesmo fluxo do avatar, mas para a imagem de capa.
// ============================================================
exports.uploadCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const coverUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverUrl },
      { new: true }
    );
    
    res.json({ 
      message: 'Capa atualizada com sucesso!',
      coverUrl: user.coverUrl
    });
  } catch (error) {
    console.error('Erro uploadCover:', error);
    res.status(500).json({ message: 'Erro ao fazer upload da capa.' });
  }
};

// ============================================================
// 3. ATUALIZAR CAPA POR URL
// Alternativa ao upload: o usuário cola uma URL de imagem.
// Útil para imagens já hospedadas (Imgur, etc).
// ============================================================
exports.updateCoverByUrl = async (req, res) => {
  try {
    const { coverUrl } = req.body;
    
    if (!coverUrl) {
      return res.status(400).json({ message: 'URL da capa é obrigatória.' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverUrl },
      { new: true }
    );
    
    res.json({ 
      message: 'Capa atualizada!', 
      coverUrl: user.coverUrl 
    });
  } catch (error) {
    console.error('Erro updateCoverByUrl:', error);
    res.status(500).json({ message: 'Erro ao atualizar capa.' });
  }
};