import torch
import torch.nn as nn

class StatusNet(nn.Module):
    """Нейронная сеть для классификации статуса задач"""
    
    def __init__(
        self,
        vocab_size: int,
        embedding_dim: int = 100,
        hidden_dim: int = 128,
        num_statuses: int = 7,
        num_layers: int = 2,
        num_heads: int = 4,
        dropout: float = 0.3
    ):
        super(StatusNet, self).__init__()
        
        # Embedding layer
        self.embedding = nn.Embedding(
            vocab_size,
            embedding_dim,
            padding_idx=0
        )
        
        # Layer normalization
        self.layer_norm1 = nn.LayerNorm(embedding_dim)
        
        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            embedding_dim,
            hidden_dim,
            batch_first=True,
            bidirectional=True,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Layer normalization after LSTM
        self.layer_norm2 = nn.LayerNorm(hidden_dim * 2)
        
        # Multi-head attention
        self.attention = nn.MultiheadAttention(
            hidden_dim * 2,
            num_heads=num_heads,
            batch_first=True,
            dropout=dropout
        )
        
        # Classification head
        self.status_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_statuses)
        )
    
    def forward(self, text_ids):
        """
        Forward pass
        
        Args:
            text_ids: Tensor of shape (batch_size, seq_len)
            
        Returns:
            Logits of shape (batch_size, num_statuses)
        """
        # Embedding
        embedded = self.embedding(text_ids)  # (batch, seq_len, emb_dim)
        embedded = self.layer_norm1(embedded)
        
        # LSTM
        lstm_out, _ = self.lstm(embedded)  # (batch, seq_len, hidden*2)
        lstm_out = self.layer_norm2(lstm_out)
        
        # Self-attention
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Use last hidden state
        last_hidden = lstm_out[:, -1, :]  # (batch, hidden*2)
        
        # Classification
        logits = self.status_head(last_hidden)  # (batch, num_statuses)
        
        return logits
